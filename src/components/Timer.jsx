import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(seconds) {
  const abs = Math.abs(seconds);

  const minutes = Math.floor(abs / 60);
  const secs = abs % 60;

  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return seconds < 0 ? `-${formatted}` : formatted;
}

export default function Timer({
  initialTime = 72,
  onComplete = () => {},
  onNext = () => {},
}) {
  const [seconds, setSeconds] = useState(initialTime);
  const [maxTime, setMaxTime] = useState(initialTime);
  const [running, setRunning] = useState(false);
  const [overtime, setOvertime] = useState(false);

  const radius = 150;
  const circumference = 2 * Math.PI * radius;

  const progress = overtime
    ? 0
    : Math.max(0, Math.min(seconds / maxTime, 1));

  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (!overtime) {
          if (prev <= 1) {
            setOvertime(true);
            onComplete();
            return -1;
          }

          return prev - 1;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, overtime, onComplete]);

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
    reset();
    onNext();
  };

  return (
    <div className="flex flex-col items-center gap-12">
      <div
        onDoubleClick={reset}
        className="relative flex h-80 w-80 select-none items-center justify-center"
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
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke={overtime ? "#ef4444" : "#b7774d"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 160 160)"
            style={{
              transition: running
                ? "stroke-dashoffset 1s linear"
                : "stroke-dashoffset .2s ease",
            }}
          />
        </svg>

        <div className="relative text-center">
          <div
            className={`text-[5.5rem] font-light tracking-[-0.06em] ${
              overtime ? "text-red-500" : "text-white"
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
            className="w-full rounded-none border border-red-500 bg-red-500 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-red-600 sm:w-auto"
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
}