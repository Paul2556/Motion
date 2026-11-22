import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAuth } from "../../src/testUtils/fakeAuth.js";
import { fakeFirestore } from "../../src/testUtils/fakeFirestore.js";

let db;
let auth;
const sendEmailBatch = vi.fn();

vi.mock("./_lib/firebaseAdmin.js", () => ({ getAdminDb: () => db, getAdminAuth: () => auth }));
vi.mock("./_lib/requireOwner.js", () => ({ verifyOwner: async () => ({ email: "owner@motionmun.com" }) }));
vi.mock("../source/_lib/sendEmail.js", () => ({ sendEmailBatch: (...args) => sendEmailBatch(...args) }));

const { default: handler } = await import("./announcements.js");

function response() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

async function call(method, body) {
  const res = response();
  await handler({ method, body, headers: { authorization: "Bearer token" } }, res);
  return res;
}

const post = (body) => call("POST", body);

async function subscribe(...emails) {
  for (const email of emails) {
    await db.collection("waitlistSubscribers").doc(email).set({ email, source: "landing", unsubscribed: false });
  }
}

const waitlist = (count) => Array.from({ length: count }, (_, i) => `person${String(i).padStart(3, "0")}@example.org`);

// Every address handed to Resend, across every batch call so far.
const emailed = () => sendEmailBatch.mock.calls.flatMap(([messages]) => messages.map((m) => m.to));

async function runToEnd(id) {
  let res;
  do {
    res = await post({ action: "continue", id });
  } while (res.statusCode === 200 && res.body.announcement.status === "sending");
  return res;
}

beforeEach(() => {
  db = fakeFirestore();
  auth = fakeAuth();
  sendEmailBatch.mockReset();
  sendEmailBatch.mockResolvedValue(undefined);
  process.env.UNSUBSCRIBE_SECRET = "test-secret";
});

describe("POST /api/admin/announcements sending", () => {
  it("emails every subscriber exactly once, one batch per call", async () => {
    await subscribe(...waitlist(250));

    const started = await post({ action: "start", audience: "waitlist", subject: "Motion is live", body: "Come try it." });
    expect(started.statusCode).toBe(200);
    expect(started.body.announcement).toMatchObject({ status: "sending", sent: 0, failed: 0, remaining: 250 });

    const first = await post({ action: "continue", id: started.body.announcement.id });
    expect(sendEmailBatch).toHaveBeenCalledTimes(1);
    expect(first.body.announcement).toMatchObject({ status: "sending", sent: 100, failed: 0, remaining: 150 });

    const last = await runToEnd(started.body.announcement.id);
    expect(last.body.announcement).toMatchObject({ status: "done", sent: 250, failed: 0, remaining: 0 });
    expect(sendEmailBatch).toHaveBeenCalledTimes(3);
    expect(emailed().sort()).toEqual(waitlist(250));
  });

  it("resumes a send abandoned mid-way without re-emailing anyone", async () => {
    await subscribe(...waitlist(250));
    const started = await post({ action: "start", audience: "waitlist", subject: "Motion is live", body: "Come try it." });
    await post({ action: "continue", id: started.body.announcement.id });

    // The tab closed. Reopening the panel finds the unfinished send.
    const listed = await call("GET");
    expect(listed.body.lastAnnouncement).toMatchObject({
      id: started.body.announcement.id,
      subject: "Motion is live",
      status: "sending",
      sent: 100,
      remaining: 150,
    });

    const last = await runToEnd(listed.body.lastAnnouncement.id);
    expect(last.body.announcement).toMatchObject({ status: "done", sent: 250, remaining: 0 });
    expect(emailed().sort()).toEqual(waitlist(250));
  });

  it("pressing Send again on an unfinished announcement resumes it", async () => {
    await subscribe(...waitlist(250));
    const announcement = { subject: "Motion is live", body: "Come try it." };
    const first = await post({ action: "start", audience: "waitlist", ...announcement });
    await post({ action: "continue", id: first.body.announcement.id });

    const again = await post({ action: "start", audience: "waitlist", ...announcement });
    expect(again.body.announcement).toMatchObject({ id: first.body.announcement.id, sent: 100, remaining: 150 });

    await runToEnd(again.body.announcement.id);
    expect(emailed().sort()).toEqual(waitlist(250));
  });

  it("starts a fresh send once the previous one has finished", async () => {
    await subscribe("ada@example.org");
    const announcement = { subject: "Motion is live", body: "Come try it." };
    const first = await post({ action: "start", audience: "waitlist", ...announcement });
    await runToEnd(first.body.announcement.id);

    const second = await post({ action: "start", audience: "waitlist", ...announcement });
    expect(second.body.announcement.id).not.toBe(first.body.announcement.id);
    await runToEnd(second.body.announcement.id);
    expect(emailed()).toEqual(["ada@example.org", "ada@example.org"]);
  });

  it("counts a rejected batch as failed, finishes the rest, and retries only the failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await subscribe(...waitlist(250));
    sendEmailBatch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Resend API returned 500"));

    const started = await post({ action: "start", audience: "waitlist", subject: "Motion is live", body: "Come try it." });
    const { id } = started.body.announcement;
    const finished = await runToEnd(id);
    expect(finished.body.announcement).toMatchObject({ status: "done", sent: 150, failed: 100, remaining: 0 });

    sendEmailBatch.mockClear();
    const retrying = await post({ action: "retryFailed", id });
    expect(retrying.body.announcement).toMatchObject({ status: "sending", sent: 150, failed: 0, remaining: 100 });

    const retried = await runToEnd(id);
    expect(retried.body.announcement).toMatchObject({ status: "done", sent: 250, failed: 0, remaining: 0 });
    expect(emailed()).toEqual(waitlist(250).slice(100, 200));
  });

  it("a retry after the batch went out but before it was recorded is dropped by Resend", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Resend's documented behaviour: a repeated Idempotency-Key within 24 hours
    // returns the original response without sending again.
    const delivered = [];
    const seenKeys = new Set();
    sendEmailBatch.mockImplementation(async (messages, { idempotencyKey } = {}) => {
      if (idempotencyKey && seenKeys.has(idempotencyKey)) return;
      if (idempotencyKey) seenKeys.add(idempotencyKey);
      delivered.push(...messages.map((m) => m.to));
    });
    await subscribe(...waitlist(150));
    const started = await post({ action: "start", audience: "waitlist", subject: "Motion is live", body: "Come try it." });
    const { id } = started.body.announcement;

    db.failNextCommit();
    const crashed = await post({ action: "continue", id });
    expect(crashed.statusCode).toBe(500);

    const finished = await runToEnd(id);
    expect(finished.body.announcement).toMatchObject({ status: "done", sent: 150, remaining: 0 });
    expect(delivered.sort()).toEqual(waitlist(150));
  });
});

const hash = (email) => createHash("sha256").update(email).digest("hex");

describe("announcement audiences", () => {
  beforeEach(async () => {
    await subscribe("ada@example.org", "both@example.org");
    await db.collection("waitlistSubscribers").doc(hash("gone@example.org")).set({ email: "gone@example.org", unsubscribed: true });
    await db.collection("emailOptOuts").doc(hash("optedout@example.org")).set({});
    auth = fakeAuth([
      { email: "Both@Example.org" },
      { email: "chair@example.org" },
      { email: "gone@example.org" },
      { email: "optedout@example.org" },
      { email: "banned@example.org", disabled: true },
      { email: "qr-123@motion-quicklogin.local" },
      { email: undefined },
    ]);
  });

  const sendTo = async (audience) => {
    const started = await post({ action: "start", audience, subject: "News", body: "Hello" });
    return started.statusCode === 200 ? runToEnd(started.body.announcement.id) : started;
  };

  it("counts each audience once per person, without opt-outs or unreachable accounts", async () => {
    const res = await call("GET");

    expect(res.body.audiences).toEqual({ waitlist: 2, users: 2, both: 3 });
    expect(res.body.overlap).toBe(1);
  });

  // Unsubscribe links used to leave an email-less waitlist row for anyone not on the list.
  it("keeps honouring old opt-out rows but leaves them out of the subscriber list", async () => {
    await db.collection("waitlistSubscribers").doc(hash("chair@example.org")).set({ unsubscribed: true });

    const res = await call("GET");

    expect(res.body.audiences.users).toBe(1);
    expect(res.body.subscribers.map((s) => s.email).sort()).toEqual(["ada@example.org", "both@example.org", "gone@example.org"]);
    expect(res.body.total).toBe(3);
  });

  it("emails everyone in the chosen audience once", async () => {
    const res = await sendTo("both");

    expect(res.body.announcement).toMatchObject({ status: "done", sent: 3, remaining: 0 });
    expect(emailed().sort()).toEqual(["ada@example.org", "both@example.org", "chair@example.org"]);
  });

  it("emails only signed-up accounts when that audience is chosen", async () => {
    await sendTo("users");

    expect(emailed().sort()).toEqual(["both@example.org", "chair@example.org"]);
  });

  it("refuses to send without a known audience", async () => {
    const res = await sendTo("everyone");

    expect(res.statusCode).toBe(400);
    expect(emailed()).toEqual([]);
  });

  it("starts a fresh send when the same text goes to a different audience", async () => {
    const toWaitlist = await post({ action: "start", audience: "waitlist", subject: "News", body: "Hello" });

    const toUsers = await post({ action: "start", audience: "users", subject: "News", body: "Hello" });

    expect(toUsers.body.announcement.id).not.toBe(toWaitlist.body.announcement.id);
    expect(toUsers.body.announcement.remaining).toBe(2);
  });

  it("finishes a send started before audiences existed as a waitlist send", async () => {
    const ref = db.collection("announcements").doc("legacy");
    await ref.set({ subject: "News", body: "Hello", status: "sending", sent: 0, failed: 0, remaining: 2 });

    const res = await runToEnd("legacy");

    expect(res.body.announcement).toMatchObject({ status: "done", sent: 2 });
    expect(emailed().sort()).toEqual(["ada@example.org", "both@example.org"]);
  });
});
