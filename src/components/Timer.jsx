import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(seconds) {
  const abs = Math.abs(seconds);

  const minutes = Math.floor(abs / 60);
  const secs = abs % 60;

  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return seconds < 0 ? `-${formatted}` : formatted;
}

const Timer = forwardRef(function Timer({
  initialTime = 72,
  onComplete = () => {},
  onNext = () => {},
}, ref) {
  const [seconds, setSeconds] = useState(initialTime);
  const [maxTime, setMaxTime] = useState(initialTime);
  const [running, setRunning] = useState(false);
  const [overtime, setOvertime] = useState(false);

  // `onComplete` defaults to a fresh `() => {}` on every render (a new
  // default-parameter closure each call), and callers can pass their own
  // inline arrow function too - either way the reference is unstable across
  // renders. A ref sidesteps that: always call the latest callback without
  // making any effect depend on its identity.
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const radius = 150;
  const circumference = 2 * Math.PI * radius;

  const progress = overtime
    ? 0
    : Math.max(0, Math.min(seconds / maxTime, 1));

  const offset = circumference * (1 - progress);

  const ringRef = useRef(null);

  // Wall-clock anchor {time, value} the continuous animation is computed
  // from every frame. A setInterval only ever updates once per second no
  // matter what, so a CSS transition is really just interpolating between
  // two once-a-second snapshots - it can look smooth but is never *actually*
  // continuous, and any timing jitter between ticks shows up as visible
  // unevenness. Re-deriving the exact fractional position from real elapsed
  // time on every animation frame (~60fps) instead removes that ceiling
  // entirely. Re-anchored whenever running starts/resumes or `seconds` is
  // changed directly (addTime/reset), so it always continues from the
  // correct point rather than drifting.
  const anchorRef = useRef({ time: 0, value: initialTime });

  useEffect(() => {
    anchorRef.current = { time: Date.now(), value: seconds };
  }, [seconds, running]);

  useEffect(() => {
    if (!running) return;

    let frame;

    const tick = () => {
      const elapsed = (Date.now() - anchorRef.current.time) / 1000;
      const value = anchorRef.current.value - elapsed;

      if (ringRef.current) {
        const liveProgress = overtime
          ? 0
          : Math.max(0, Math.min(value / maxTime, 1));

        ringRef.current.style.strokeDashoffset = circumference * (1 - liveProgress);
      }

      if (!overtime && value <= 0) {
        setOvertime(true);
        onCompleteRef.current();
        setSeconds(-1);
      } else {
        const rounded = Math.ceil(value);
        setSeconds((prev) => (prev === rounded ? prev : rounded));
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const ring = ringRef.current;

    return () => {
      cancelAnimationFrame(frame);
      // Drop the imperative override so the attribute-driven (React state)
      // value takes back over for the static, paused rendering.
      if (ring) ring.style.strokeDashoffset = "";
    };
  }, [running, overtime, maxTime, circumference]);

  const addTime = (amount) => {
    setSeconds((prev) => {
      const next = Math.max(0, prev + amount);

      if (next > maxTime) {
        setMaxTime(next);
      }

      if (next > 0) {
        setOvertime(false);
      }

      return next;
    });
  };

  const reset = () => {
    setRunning(false);
    setSeconds(initialTime);
    setMaxTime(initialTime);
    setOvertime(false);
  };

  const nextSpeaker = () => {
    const elapsed = maxTime - seconds;
    reset();
    onNext(elapsed);
  };

  // Exposes just the actions a parent needs to drive from outside (the dais
  // keyboard shortcuts' Space/R/Enter) - everything else about the timer's
  // internal animation/state stays fully encapsulated. triggerNext reuses
  // this same nextSpeaker (not a raw onNext(0) call from the parent), so a
  // keyboard-triggered advance still reports the real elapsed time, exactly
  // like the mouse "Next" button does.
  useImperativeHandle(ref, () => ({
    toggleRunning: () => setRunning((r) => !r),
    reset,
    triggerNext: nextSpeaker,
  }));

  return (
    <div className="flex flex-col items-center gap-12">
      <div
        onDoubleClick={reset}
        className="relative flex h-56 w-56 select-none items-center justify-center sm:h-72 sm:w-72 lg:h-80 lg:w-80"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 320 320"
        >
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="4"
          />

          <circle
            ref={ringRef}
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke={overtime ? "var(--danger)" : "var(--timer-remaining)"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 160 160)"
            style={{ transition: running ? "none" : "stroke-dashoffset .2s ease" }}
          />
        </svg>

        <div className="relative text-center">
          <div
            className={`text-[3.25rem] font-light tracking-[-0.06em] sm:text-[4.25rem] lg:text-[5.5rem] ${
              overtime ? "text-[var(--danger)]" : "text-white"
            }`}
          >
            {formatTime(seconds)}
          </div>

          <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/35">
            {overtime ? "Overtime" : "Remaining"}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {!overtime && (
            <button
            onClick={() => addTime(-15)}
            className="w-full rounded-none border border-white/10 bg-white/5 px-6 py-4 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10 sm:w-auto"
            >
            -15s total
            </button>
        )}

        <button
            onClick={() => setRunning((r) => !r)}
            className="flex w-full items-center justify-center gap-2 rounded-none border border-white/10 bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 sm:w-auto"
        >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
        </button>

        {overtime ? (
            <button
            onClick={nextSpeaker}
            className="w-full rounded-none border border-[var(--danger)] bg-[var(--danger)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-90 sm:w-auto"
            >
            Next
            </button>
        ) : (
            <button
            onClick={() => addTime(15)}
            className="w-full rounded-none border border-white/10 bg-white/5 px-6 py-4 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10 sm:w-auto"
            >
            +15s total
            </button>
        )}
        </div>
    </div>
  );
});

export default Timer;