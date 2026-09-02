import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatTime } from "../utils/formatTime";

const MAX_MINUTES = 999;
const MAX_SECONDS = 59;

// Digits only, capped at 3 chars then clamped to MAX_MINUTES. Round-tripping
// through Number/String strips leading zeros, without which typing after
// clearing would prepend ("0" + "3" -> "03") instead of replacing.
function sanitizeMinutesInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 3);
  if (digits === "") return "0";
  return String(Math.min(MAX_MINUTES, Number(digits)));
}

// Same shape as sanitizeMinutesInput, capped to 2 characters then clamped to
// MAX_SECONDS - "99" is representable in 2 digits but not a valid seconds
// value, so this needs the numeric clamp on top of the length cap.
function sanitizeSecondsInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "0";
  return String(Math.min(MAX_SECONDS, Number(digits)));
}

const Timer = forwardRef(function Timer({
  initialTime = 72,
  onComplete = () => {},
  onNext = () => {},
  onAnchorChange = () => {},
  editable = false,
}, ref) {
  const [seconds, setSeconds] = useState(initialTime);
  const [maxTime, setMaxTime] = useState(initialTime);
  const [running, setRunning] = useState(false);
  const [overtime, setOvertime] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMinutes, setEditMinutes] = useState("");
  const [editSeconds, setEditSeconds] = useState("");
  const editContainerRef = useRef(null);

  // `onComplete`'s reference is unstable across renders, so a ref lets the
  // animation effect call the latest callback without depending on its
  // identity and restarting.
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Same instability as onCompleteRef above.
  const onAnchorChangeRef = useRef(onAnchorChange);

  useEffect(() => {
    onAnchorChangeRef.current = onAnchorChange;
  }, [onAnchorChange]);

  const radius = 150;
  const circumference = 2 * Math.PI * radius;

  const progress = overtime
    ? 0
    : Math.max(0, Math.min(seconds / maxTime, 1));

  const offset = circumference * (1 - progress);

  const ringRef = useRef(null);

  // Wall-clock anchor the animation recomputes from every frame: a
  // setInterval only updates once a second, so a CSS transition just
  // interpolates stale snapshots and any jitter shows. Re-anchored when
  // running or `seconds` changes, so it resumes correctly rather than drifting.
  const anchorRef = useRef({ time: 0, value: initialTime });

  useEffect(() => {
    anchorRef.current = { time: Date.now(), value: seconds };
  }, [seconds, running, maxTime, overtime]);

  // Publishes an anchor to the caller (SessionBoard forwards this to
  // LiveSessionService) only at genuine transition points - start/pause,
  // +-15s, edit, reset, overtime - not on every per-second RAF re-anchor
  // above, which would otherwise write to Firestore roughly once a second
  // for as long as any dais timer runs.
  const publishAnchor = (value, overrides = {}) => {
    const time = Date.now();
    anchorRef.current = { time, value };
    onAnchorChangeRef.current({
      time,
      value,
      maxTime: overrides.maxTime ?? maxTime,
      running: overrides.running ?? running,
      overtime: overrides.overtime ?? overtime,
    });
  };

  // Same instability as onCompleteRef above - lets the tick effect below call
  // the latest publishAnchor (which closes over this render's maxTime/running/
  // overtime) without those needing to sit in its dependency array and
  // restart the RAF loop every render.
  const publishAnchorRef = useRef(publishAnchor);

  useEffect(() => {
    publishAnchorRef.current = publishAnchor;
  });

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
        publishAnchorRef.current(-1, { overtime: true });
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
      const nextOvertime = next > 0 ? false : overtime;

      if (next > 0) {
        setOvertime(false);
      }

      publishAnchor(next, { overtime: nextOvertime });
      return next;
    });
  };

  // Double-clicking the ring resets by default (SessionBoard's per-speaker
  // timer) - `editable` swaps that for typing a new time directly in place
  // (TimerPage) instead.
  const reset = () => {
    setRunning(false);
    setSeconds(initialTime);
    setMaxTime(initialTime);
    setOvertime(false);
    publishAnchor(initialTime, { maxTime: initialTime, running: false, overtime: false });
  };

  function startEditing() {
    const clamped = Math.max(seconds, 0);
    setRunning(false);
    setEditMinutes(String(Math.min(MAX_MINUTES, Math.floor(clamped / 60))).padStart(2, "0"));
    setEditSeconds(String(clamped % 60).padStart(2, "0"));
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);

    const minutes = editMinutes === "" ? 0 : Number(editMinutes);
    const secs = editSeconds === "" ? 0 : Number(editSeconds);
    const total = minutes * 60 + secs;
    if (total <= 0) return;

    setRunning(false);
    setSeconds(total);
    setMaxTime(total);
    setOvertime(false);
    publishAnchor(total, { maxTime: total, running: false, overtime: false });
  }

  // Only commits once focus leaves both fields entirely (not when tabbing
  // from minutes to seconds) - checked via relatedTarget rather than a
  // per-field blur, which would commit a half-typed value the instant the
  // minutes field loses focus to the seconds field right next to it.
  function handleEditBlur(event) {
    if (!editContainerRef.current?.contains(event.relatedTarget)) {
      commitEdit();
    }
  }

  function handleEditKeyDown(event) {
    if (event.key === "Enter") commitEdit();
    if (event.key === "Escape") setEditing(false);
  }

  const nextSpeaker = () => {
    const elapsed = maxTime - seconds;
    reset();
    onNext(elapsed);
  };

  const toggleRunning = () => {
    setRunning((prev) => {
      const next = !prev;
      publishAnchor(seconds, { running: next });
      return next;
    });
  };

  const start = () => {
    setRunning(true);
    publishAnchor(seconds, { running: true });
  };

  // Exposes only what the dais keyboard shortcuts need, keeping the timer's
  // internal state encapsulated. triggerNext reuses nextSpeaker so a
  // keyboard advance reports real elapsed time, like the button does.
  useImperativeHandle(ref, () => ({
    toggleRunning,
    start,
    reset,
    triggerNext: nextSpeaker,
  }));

  return (
    <div className="flex flex-col items-center gap-12">
      <div
        onDoubleClick={editable ? startEditing : reset}
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
          {editing ? (
            <div
              ref={editContainerRef}
              onBlur={handleEditBlur}
              className="flex items-baseline justify-center text-[3.25rem] font-light tracking-[-0.06em] text-[var(--app-text)] sm:text-[4.25rem] lg:text-[5.5rem]"
            >
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={editMinutes}
                onChange={(event) => setEditMinutes(sanitizeMinutesInput(event.target.value))}
                onFocus={(event) => event.target.select()}
                onKeyDown={handleEditKeyDown}
                className="w-[2em] bg-transparent text-center outline-none"
              />
              <span>:</span>
              <input
                type="text"
                inputMode="numeric"
                value={editSeconds}
                onChange={(event) => setEditSeconds(sanitizeSecondsInput(event.target.value))}
                onFocus={(event) => event.target.select()}
                onKeyDown={handleEditKeyDown}
                className="w-[2em] bg-transparent text-center outline-none"
              />
            </div>
          ) : (
            <div
              className={`text-[3.25rem] font-light tracking-[-0.06em] sm:text-[4.25rem] lg:text-[5.5rem] ${
                overtime ? "text-[var(--danger)]" : "text-[var(--app-text)]"
              }`}
            >
              {formatTime(seconds)}
            </div>
          )}

          <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--app-text-faint)]">
            {editing ? "Type a time" : overtime ? "Overtime" : "Remaining"}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {!overtime && (
            <button
            onClick={() => addTime(-15)}
            className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-6 py-4 text-sm uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)] sm:w-auto"
            >
            -15s
            </button>
        )}

        <button
            onClick={toggleRunning}
            className="flex w-full items-center justify-center gap-2 rounded-none border border-[var(--app-border)] bg-[var(--app-cta-bg)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-cta-text)] transition hover:bg-[var(--app-cta-hover)] sm:w-auto"
        >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
        </button>

        {overtime ? (
            <button
            onClick={nextSpeaker}
            className="w-full rounded-none border border-[var(--danger)] bg-[var(--danger)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-text)] transition hover:brightness-90 sm:w-auto"
            >
            Next
            </button>
        ) : (
            <button
            onClick={() => addTime(15)}
            className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-6 py-4 text-sm uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)] sm:w-auto"
            >
            +15s
            </button>
        )}
        </div>
    </div>
  );
});

export default Timer;