import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(0)).toBe("00:00");
  });

  it("shows the first second of overtime as 00:00, then counts up", () => {
    expect(formatTime(Math.ceil(-0.3))).toBe("00:00");
    expect(formatTime(Math.ceil(-1.2))).toBe("-00:01");
    expect(formatTime(-75)).toBe("-01:15");
  });
});
