import { useState } from "react";

const PRESET_SECONDS = [60, 75, 90];

// Presets fire onSelect immediately (this is a launch action, not a form) -
// only "More" needs a confirm step since it has to wait for typed input.
export default function SpeakingTimeSelector({ onSelect }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  function submitCustom() {
    const seconds = Number(customValue);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    onSelect(Math.round(seconds));
  }

  return (
    <div className="mt-6 border border-white/10 bg-[#121212] p-6">
      <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Speaking time</p>
      <p className="mt-2 text-sm text-white/45">
        Choose how long each speaker gets, then continue to the speakers' list.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {PRESET_SECONDS.map((seconds) => (
          <button
            key={seconds}
            onClick={() => onSelect(seconds)}
            className="border border-white/10 bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
          >
            {seconds} Seconds
          </button>
        ))}

        {customOpen ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCustom()}
              placeholder="Seconds..."
              className="w-28 border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
            />
            <button
              onClick={submitCustom}
              className="border border-white/10 bg-white px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-black transition hover:bg-white/90"
            >
              Start
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCustomOpen(true)}
            className="border border-white/10 bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
          >
            More
          </button>
        )}
      </div>
    </div>
  );
}
