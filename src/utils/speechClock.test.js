import { describe, expect, it } from "vitest";
import { createSpeechClock } from "./speechClock";

describe("speechClock", () => {
  it("counts only the time the timer was running, across pauses", () => {
    const clock = createSpeechClock();

    clock.start(0);
    clock.pause(30_000);
    clock.start(100_000);

    expect(clock.elapsed(145_000)).toBe(75);
  });
});
