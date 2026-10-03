import { describe, expect, it } from "vitest";
import { createCountdown } from "./countdown";

describe("countdown", () => {
  it("counts down against the wall clock only while running", () => {
    const countdown = createCountdown(60);
    expect(countdown.remaining(5_000)).toBe(60);
    countdown.start(10_000);
    expect(countdown.remaining(30_000)).toBe(40);
  });

  it("resumes from the exact moment it was paused, not a rounded second", () => {
    const countdown = createCountdown(60);
    countdown.start(0);
    countdown.pause(1_300);
    expect(countdown.remaining(9_000)).toBeCloseTo(58.7);
    countdown.start(10_000);
    expect(countdown.remaining(11_000)).toBeCloseTo(57.7);
  });

  it("loses no time over many pauses", () => {
    const countdown = createCountdown(180);
    let now = 0;
    for (let k = 0; k < 10; k++) {
      countdown.start(now);
      now += 1_250;
      countdown.pause(now);
      now += 400;
    }
    expect(countdown.remaining(now)).toBeCloseTo(180 - 12.5);
  });

  it("adds time to the live value", () => {
    const countdown = createCountdown(60);
    countdown.start(0);
    countdown.set(countdown.remaining(10_500) + 15, 10_500);
    expect(countdown.remaining(11_500)).toBeCloseTo(63.5);
  });

  it("ignores a second start or pause", () => {
    const countdown = createCountdown(60);
    countdown.start(0);
    countdown.start(5_000);
    expect(countdown.remaining(10_000)).toBe(50);
    countdown.pause(10_000);
    countdown.pause(20_000);
    expect(countdown.remaining(30_000)).toBe(50);
  });

  it("exposes its anchor for the live broadcast", () => {
    const countdown = createCountdown(60);
    countdown.start(1_000);
    countdown.pause(3_000);
    expect(countdown.anchor()).toEqual({ time: 3_000, value: 58 });
  });
});
