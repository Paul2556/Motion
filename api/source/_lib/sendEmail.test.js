import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmailBatch } from "./sendEmail.js";

afterEach(() => vi.unstubAllGlobals());

describe("sendEmailBatch", () => {
  it("passes the idempotency key to Resend so a repeated batch is not sent twice", async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetch);

    await sendEmailBatch([{ to: "ada@example.org", subject: "Hi", html: "<p>Hi</p>" }], { idempotencyKey: "announcement/a1/abc" });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(init.headers["Idempotency-Key"]).toBe("announcement/a1/abc");
  });
});
