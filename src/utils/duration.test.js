import { describe, expect, it } from "vitest";
import { durationToMinutes, formatDuration, toWholeSeconds } from "./duration";

describe("durationToMinutes", () => {
  it("reads a typed amount in either unit", () => {
    expect(durationToMinutes("10", "min")).toBe(10);
    expect(durationToMinutes("90", "sec")).toBe(1.5);
    expect(durationToMinutes("1.5", "min")).toBe(1.5);
  });

  it("treats blank, zero, negative, and junk as no duration", () => {
    expect(durationToMinutes("", "min")).toBeNull();
    expect(durationToMinutes("0", "min")).toBeNull();
    expect(durationToMinutes("-5", "min")).toBeNull();
    expect(durationToMinutes("e", "sec")).toBeNull();
  });

  it("rejects amounts too short to time", () => {
    expect(durationToMinutes("0.4", "sec")).toBeNull();
    expect(durationToMinutes("0.005", "min")).toBeNull();
    expect(durationToMinutes("1", "sec")).toBe(1 / 60);
  });
});

describe("toWholeSeconds", () => {
  it("rounds minutes to whole seconds", () => {
    expect(toWholeSeconds(1)).toBe(60);
    expect(toWholeSeconds(20 / 60 - 1e-12)).toBe(20);
  });

  it("gives null for missing or sub-second times", () => {
    expect(toWholeSeconds(null)).toBeNull();
    expect(toWholeSeconds(undefined)).toBeNull();
    expect(toWholeSeconds(0)).toBeNull();
    expect(toWholeSeconds(0.004 / 60)).toBeNull();
    expect(toWholeSeconds(-1)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("shows the unit that reads naturally", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0.2)).toBe("12 sec");
    expect(formatDuration(10)).toBe("10 min");
    expect(formatDuration(1.5)).toBe("1m 30s");
  });
});
