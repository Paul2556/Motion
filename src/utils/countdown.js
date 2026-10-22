// The timer's remaining time, in seconds, anchored to the wall clock. Only
// user actions move the anchor, never the per-second display, so rounding
// can't creep in and pause/resume keeps the exact fraction. `now` is passed
// in (ms) so it stays pure and testable, like speechClock.js.
export function createCountdown(value) {
  let anchor = { time: 0, value };
  let running = false;

  const remaining = (now) => (running ? anchor.value - (now - anchor.time) / 1000 : anchor.value);

  return {
    remaining,
    start(now) {
      if (running) return;
      anchor = { time: now, value: anchor.value };
      running = true;
    },
    pause(now) {
      if (!running) return;
      anchor = { time: now, value: remaining(now) };
      running = false;
    },
    // A new value from +15s/-15s, an edit, a reset, or overtime.
    set(nextValue, now) {
      anchor = { time: now, value: nextValue };
    },
    anchor: () => anchor,
  };
}
