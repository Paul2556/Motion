import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAuth } from "../../src/testUtils/fakeAuth.js";
import { fakeFirestore } from "../../src/testUtils/fakeFirestore.js";

const { firebase, firebaseAdmin } = vi.hoisted(() => {
  const firebase = { db: null, auth: null };
  return { firebase, firebaseAdmin: () => ({ getAdminDb: () => firebase.db, getAdminAuth: () => firebase.auth }) };
});
vi.mock("../source/_lib/firebaseAdmin.js", firebaseAdmin);
vi.mock("../admin/_lib/firebaseAdmin.js", firebaseAdmin);
vi.mock("../admin/_lib/requireOwner.js", () => ({ verifyOwner: async () => ({ email: "owner@example.org" }) }));
vi.mock("../source/_lib/rateLimit.js", () => ({ checkRateLimit: async () => {}, RateLimitError: class extends Error {} }));

const { default: unsubscribe } = await import("./unsubscribe.js");
const { default: welcome } = await import("./welcome.js");
const { default: announcements } = await import("../admin/announcements.js");
const { createUnsubscribeToken } = await import("../source/_lib/unsubscribeToken.js");

const hash = (email) => createHash("sha256").update(email).digest("hex");

function response() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.setHeader = () => res;
  res.json = (body) => ((res.body = body), res);
  res.send = (body) => ((res.body = body), res);
  return res;
}

async function call(handler, req) {
  const res = response();
  await handler({ headers: {}, ...req }, res);
  return res;
}

const clickUnsubscribe = (email) =>
  call(unsubscribe, { method: "GET", query: { email, token: createUnsubscribeToken(email) } });
const joinWaitlist = (email) => call(welcome, { method: "POST", body: { email } });
const adminView = async () => (await call(announcements, { method: "GET" })).body;

beforeEach(async () => {
  vi.stubEnv("UNSUBSCRIBE_SECRET", "test-secret");
  vi.stubEnv("WAITLIST_SHEET_WEBHOOK_URL", "https://sheet.example.org");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "" })));
  firebase.db = fakeFirestore();
  await firebase.db
    .collection("waitlistSubscribers")
    .doc(hash("ada@example.org"))
    .set({ email: "ada@example.org", source: "signup", unsubscribed: false });
  firebase.auth = fakeAuth([{ email: "chair@example.org" }]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/waitlist/unsubscribe", () => {
  it("opts a signed-up user out without adding them to the waitlist", async () => {
    const res = await clickUnsubscribe("chair@example.org");

    expect(res.statusCode).toBe(200);
    const view = await adminView();
    expect(view.audiences.users).toBe(0);
    expect(view.subscribers.map((s) => s.email)).toEqual(["ada@example.org"]);
  });

  it("marks a waitlist subscriber as unsubscribed", async () => {
    await clickUnsubscribe("ada@example.org");

    const view = await adminView();
    expect(view.audiences.waitlist).toBe(0);
    expect(view.subscribers).toMatchObject([{ email: "ada@example.org", unsubscribed: true }]);
  });

  it("lets someone opt back in by joining the waitlist again", async () => {
    await clickUnsubscribe("chair@example.org");

    await joinWaitlist("chair@example.org");

    const view = await adminView();
    expect(view.audiences).toMatchObject({ waitlist: 2, users: 1 });
  });
});
