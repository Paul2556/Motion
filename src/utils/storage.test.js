import { afterEach, describe, expect, it, vi } from "vitest";
import { local, session } from "./storage";
import { memoryStorage } from "../testUtils/memoryStorage";

function throwingStorage() {
  const fail = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return { getItem: fail, setItem: fail, removeItem: fail, key: fail, get length() { return fail(); } };
}

afterEach(() => vi.unstubAllGlobals());

describe("storage", () => {
  it("reads back what it wrote", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    expect(local.set("theme", "dark")).toBe(true);
    expect(local.get("theme")).toBe("dark");
    local.remove("theme");
    expect(local.get("theme")).toBe(null);
  });

  it("acts as empty when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", throwingStorage());
    expect(local.get("theme")).toBe(null);
    expect(local.set("theme", "dark")).toBe(false);
    expect(() => local.remove("theme")).not.toThrow();
  });

  it("acts as empty when storage doesn't exist at all", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(session.get("x")).toBe(null);
    expect(session.set("x", "1")).toBe(false);
  });

  it("parses stored JSON, and treats a corrupt value as missing", () => {
    vi.stubGlobal("sessionStorage", memoryStorage());
    session.setJSON("vote", { seats: 3 });
    expect(session.getJSON("vote")).toEqual({ seats: 3 });
    sessionStorage.setItem("vote", "{not json");
    expect(session.getJSON("vote")).toBe(null);
    expect(session.getJSON("missing")).toBe(null);
  });
});
