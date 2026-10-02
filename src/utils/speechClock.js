// Wall-clock time a speech has actually been running, in seconds. Kept apart
// from the countdown so +15s/-15s and in-place edits can't skew what Stats
// records. `now` is passed in (ms) so it stays pure and testable.
export function createSpeechClock() {
  let banked = 0;
  let startedAt = null;

  return {
    start(now) {
      if (startedAt === null) startedAt = now;
    },
    pause(now) {
      if (startedAt === null) return;
      banked += now - startedAt;
      startedAt = null;
    },
    elapsed(now) {
      const running = startedAt === null ? 0 : now - startedAt;
      return (banked + running) / 1000;
    },
    reset() {
      banked = 0;
      startedAt = null;
    },
  };
}
