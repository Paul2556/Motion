import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../source/_lib/rateLimit.js", () => ({ checkRateLimit: async () => {}, RateLimitError: class extends Error {} }));

const { default: handler } = await import("./submit.js");

function response() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

const post = (body) => ({ method: "POST", body, headers: {} });

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/feedback/submit", () => {
  // Discord caps an embed field at 1024 characters, so long feedback used to be rejected and lost.
  it("sends feedback longer than a Discord field as the embed description", async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    const message = "x".repeat(1800);

    const res = response();
    await handler(post({ message, email: "chair@example.org" }), res);

    expect(res.statusCode).toBe(200);
    const [embed] = JSON.parse(fetch.mock.calls[0][1].body).embeds;
    expect(embed.description).toBe(message);
    expect(embed.fields).toEqual([{ name: "Email", value: "chair@example.org" }]);
  });

  it("still accepts the feedback when Discord can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));

    const res = response();
    await handler(post({ message: "The timer froze" }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects an email address too long to be real", async () => {
    const res = response();
    await handler(post({ message: "hi", email: `${"a".repeat(250)}@example.org` }), res);
    expect(res.statusCode).toBe(400);
  });
});
