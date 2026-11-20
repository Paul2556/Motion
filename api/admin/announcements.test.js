import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAuth, fakeFirestore } from "../../src/testUtils/fakeFirebaseAdmin.js";

const firebase = vi.hoisted(() => ({ db: null, auth: null }));
vi.mock("./_lib/firebaseAdmin.js", () => ({
  getAdminDb: () => firebase.db,
  getAdminAuth: () => firebase.auth,
}));
vi.mock("./_lib/requireOwner.js", () => ({ verifyOwner: async () => ({ email: "owner@example.org" }) }));

const { default: handler } = await import("./announcements.js");

const hash = (email) => createHash("sha256").update(email).digest("hex");
const subscriber = (email, unsubscribed = false) => [hash(email), { email, source: "signup", unsubscribed }];

function response() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

async function call(req) {
  const res = response();
  await handler({ headers: {}, ...req }, res);
  return res;
}

beforeEach(() => {
  vi.stubEnv("UNSUBSCRIBE_SECRET", "test-secret");
  firebase.db = fakeFirestore({
    waitlistSubscribers: Object.fromEntries([
      subscriber("ada@example.org"),
      subscriber("both@example.org"),
      subscriber("gone@example.org", true),
    ]),
    emailOptOuts: { [hash("optedout@example.org")]: {} },
  });
  firebase.auth = fakeAuth([
    { email: "Both@Example.org" },
    { email: "chair@example.org" },
    { email: "gone@example.org" },
    { email: "optedout@example.org" },
    { email: "banned@example.org", disabled: true },
    { email: "qr-123@motion-quicklogin.local" },
    { email: undefined },
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/admin/announcements", () => {
  it("counts each audience once per person, without opt-outs or unreachable accounts", async () => {
    const res = await call({ method: "GET" });

    expect(res.statusCode).toBe(200);
    expect(res.body.audiences).toEqual({ waitlist: 2, users: 2, both: 3 });
    expect(res.body.overlap).toBe(1);
  });

  // Unsubscribe links used to leave an email-less waitlist row for anyone not on the list.
  it("keeps honouring old opt-out rows but leaves them out of the subscriber list", async () => {
    await firebase.db.collection("waitlistSubscribers").doc(hash("chair@example.org")).set({ unsubscribed: true });

    const res = await call({ method: "GET" });

    expect(res.body.audiences.users).toBe(1);
    expect(res.body.subscribers.map((s) => s.email)).toEqual(["ada@example.org", "both@example.org", "gone@example.org"]);
    expect(res.body.total).toBe(3);
  });
});

describe("POST /api/admin/announcements send", () => {
  const send = (audience) => call({ method: "POST", body: { action: "send", subject: "News", body: "Hello", audience } });

  function stubResend() {
    const fetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    return () => fetch.mock.calls.flatMap(([, init]) => JSON.parse(init.body).map((m) => m.to)).sort();
  }

  it("emails everyone in the chosen audience once", async () => {
    const recipients = stubResend();

    const res = await send("both");

    expect(res.body).toEqual({ sent: 3, failed: 0 });
    expect(recipients()).toEqual(["ada@example.org", "both@example.org", "chair@example.org"]);
  });

  it("emails only signed-up accounts when that audience is chosen", async () => {
    const recipients = stubResend();

    await send("users");

    expect(recipients()).toEqual(["both@example.org", "chair@example.org"]);
  });

  it("refuses to send without a known audience", async () => {
    const recipients = stubResend();

    const res = await send("everyone");

    expect(res.statusCode).toBe(400);
    expect(recipients()).toEqual([]);
  });
});
