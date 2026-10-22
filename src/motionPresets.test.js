import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMotions, replaceMotions, resetMotions } from "./motionPresets";
import { MOTIONS } from "./constants";
import { memoryStorage } from "./testUtils/memoryStorage";

const KEY = "app-motion-presets";

beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));

describe("getMotions", () => {
  it("falls back to the built-in motions when the saved list isn't a list", () => {
    for (const bad of ["null", "{}", '"text"', "42", "{not json"]) {
      localStorage.setItem(KEY, bad);
      expect(getMotions()).toHaveLength(MOTIONS.length);
    }
  });

  it("drops saved entries that aren't usable motions and keeps the rest", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: "a", text: "Moderated Caucus", alias: ["Mod"] },
        null,
        { id: "b" },
        { id: "c", text: "Recess", alias: "not a list" },
        { text: "No id" },
      ])
    );
    expect(getMotions()).toEqual([
      { id: "a", text: "Moderated Caucus", alias: ["Mod"] },
      { id: "c", text: "Recess", alias: [] },
    ]);
  });

  it("keeps an intentionally emptied list empty", () => {
    localStorage.setItem(KEY, "[]");
    expect(getMotions()).toEqual([]);
  });
});

describe("replaceMotions", () => {
  // The account copy comes from Firestore, so a bad document can't be trusted either.
  it("ignores a server copy that isn't a list", () => {
    replaceMotions([{ id: "x", text: "Recess" }]);
    replaceMotions({ motions: "oops" });
    expect(getMotions()).toEqual([{ id: "x", text: "Recess" }]);
  });

  it("is undone by a reset", () => {
    replaceMotions([{ id: "x", text: "Recess" }]);
    resetMotions();
    expect(getMotions()).toHaveLength(MOTIONS.length);
  });
});
