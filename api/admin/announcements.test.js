import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeFirestore } from "../../src/testUtils/fakeFirestore.js";

let db;
const sendEmailBatch = vi.fn();

vi.mock("./_lib/firebaseAdmin.js", () => ({ getAdminDb: () => db }));
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
  sendEmailBatch.mockReset();
  sendEmailBatch.mockResolvedValue(undefined);
  process.env.UNSUBSCRIBE_SECRET = "test-secret";
});

describe("POST /api/admin/announcements sending", () => {
  it("emails every subscriber exactly once, one batch per call", async () => {
    await subscribe(...waitlist(250));

    const started = await post({ action: "start", subject: "Motion is live", body: "Come try it." });
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
    const started = await post({ action: "start", subject: "Motion is live", body: "Come try it." });
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
    const first = await post({ action: "start", ...announcement });
    await post({ action: "continue", id: first.body.announcement.id });

    const again = await post({ action: "start", ...announcement });
    expect(again.body.announcement).toMatchObject({ id: first.body.announcement.id, sent: 100, remaining: 150 });

    await runToEnd(again.body.announcement.id);
    expect(emailed().sort()).toEqual(waitlist(250));
  });

  it("starts a fresh send once the previous one has finished", async () => {
    await subscribe("ada@example.org");
    const announcement = { subject: "Motion is live", body: "Come try it." };
    const first = await post({ action: "start", ...announcement });
    await runToEnd(first.body.announcement.id);

    const second = await post({ action: "start", ...announcement });
    expect(second.body.announcement.id).not.toBe(first.body.announcement.id);
    await runToEnd(second.body.announcement.id);
    expect(emailed()).toEqual(["ada@example.org", "ada@example.org"]);
  });

  it("counts a rejected batch as failed, finishes the rest, and retries only the failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await subscribe(...waitlist(250));
    sendEmailBatch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Resend API returned 500"));

    const started = await post({ action: "start", subject: "Motion is live", body: "Come try it." });
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
    const started = await post({ action: "start", subject: "Motion is live", body: "Come try it." });
    const { id } = started.body.announcement;

    db.failNextCommit();
    const crashed = await post({ action: "continue", id });
    expect(crashed.statusCode).toBe(500);

    const finished = await runToEnd(id);
    expect(finished.body.announcement).toMatchObject({ status: "done", sent: 150, remaining: 0 });
    expect(delivered.sort()).toEqual(waitlist(150));
  });
});
