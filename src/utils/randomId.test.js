import { afterEach, describe, expect, it, vi } from "vitest";
import { randomId } from "./randomId";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const realCrypto = globalThis.crypto;

afterEach(() => vi.unstubAllGlobals());

describe("randomId", () => {
  it("gives a fresh v4 UUID each call", () => {
    const a = randomId();
    expect(a).toMatch(UUID_V4);
    expect(randomId()).not.toBe(a);
  });

  // Plain-HTTP LAN hosts aren't a secure context, so randomUUID is missing there.
  it("still works where crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", { getRandomValues: (bytes) => realCrypto.getRandomValues(bytes) });
    const a = randomId();
    expect(a).toMatch(UUID_V4);
    expect(randomId()).not.toBe(a);
  });
});
