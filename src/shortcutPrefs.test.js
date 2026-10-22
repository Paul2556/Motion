import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllShortcutOverrides, replaceOverrides, resolveKey, setShortcutOverride } from "./shortcutPrefs";
import { memoryStorage } from "./testUtils/memoryStorage";

const KEY = "app-shortcut-overrides";

beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));

describe("shortcut overrides", () => {
  it("uses the default key when the saved overrides aren't an object", () => {
    for (const bad of ["null", "[]", '"KeyX"', "{not json"]) {
      localStorage.setItem(KEY, bad);
      expect(resolveKey("speakerList.recognizeNext")).toBe("Enter");
      expect(getAllShortcutOverrides()).toEqual({});
    }
  });

  it("ignores saved overrides that aren't key strings", () => {
    localStorage.setItem(KEY, JSON.stringify({ "speakerList.recognizeNext": 5, "speakerList.toggleTimer": "KeyT" }));
    expect(resolveKey("speakerList.recognizeNext")).toBe("Enter");
    expect(resolveKey("speakerList.toggleTimer")).toBe("KeyT");
  });

  it("can still remap after reading a corrupt value", () => {
    localStorage.setItem(KEY, "null");
    setShortcutOverride("speakerList.resetTimer", "KeyQ");
    expect(resolveKey("speakerList.resetTimer")).toBe("KeyQ");
  });

  it("ignores a server copy that isn't an object", () => {
    replaceOverrides({ "speakerList.resetTimer": "KeyQ" });
    replaceOverrides(null);
    replaceOverrides(["KeyZ"]);
    expect(resolveKey("speakerList.resetTimer")).toBe("KeyQ");
  });
});
