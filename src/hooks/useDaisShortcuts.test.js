import { describe, expect, it } from "vitest";
import { buildKeyMap, isTextEditingTarget, shortcutFor } from "./useDaisShortcuts";

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

describe("shortcutFor", () => {
  const page = { tagName: "BODY" };
  const press = (code, extra = {}) => ({ code, target: page, repeat: false, metaKey: false, ctrlKey: false, shiftKey: false, ...extra });

  it("maps a key press to the view's action", () => {
    expect(shortcutFor(press("Enter"), buildKeyMap("speakerList"))).toBe("speakerList.recognizeNext");
    expect(shortcutFor(press("KeyZ", { metaKey: true }), buildKeyMap("speakerList"))).toBe("global.undo");
  });

  // Holding Enter or Space a moment too long must not skip speakers or flicker the timer.
  it("fires one-shot actions once per press, not on key auto-repeat", () => {
    const keys = buildKeyMap("speakerList");
    expect(shortcutFor(press("Enter", { repeat: true }), keys)).toBe(null);
    expect(shortcutFor(press("Space", { repeat: true }), keys)).toBe(null);
    expect(shortcutFor(press("KeyZ", { metaKey: true, repeat: true }), keys)).toBe(null);
  });

  it("keeps repeating for held arrows and vote counting", () => {
    expect(shortcutFor(press("ArrowDown", { repeat: true }), buildKeyMap("speakerList"))).toBe("speakerList.moveDown");
    expect(shortcutFor(press("Equal", { repeat: true }), buildKeyMap("voting"))).toBe("voting.increment");
  });

  it("leaves typing alone", () => {
    expect(shortcutFor(press("Enter", { target: { tagName: "INPUT" } }), buildKeyMap("speakerList"))).toBe(null);
  });
});
