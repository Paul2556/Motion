import { describe, expect, it } from "vitest";
import { isTextEditingTarget } from "./useDaisShortcuts";

describe("isTextEditingTarget", () => {
  it("leaves keys to fields that use them", () => {
    expect(isTextEditingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTextEditingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTextEditingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("leaves arrow keys to a focused dropdown", () => {
    expect(isTextEditingTarget({ tagName: "SELECT" })).toBe(true);
  });

  it("still handles shortcuts on buttons and the page", () => {
    expect(isTextEditingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTextEditingTarget({ tagName: "BODY" })).toBe(false);
    expect(isTextEditingTarget({})).toBe(false);
  });
});
