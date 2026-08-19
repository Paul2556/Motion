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
    <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
      <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Speaking time</p>
      <p className="mt-2 text-sm text-[var(--app-text-muted)]">
        Choose how long each speaker gets, then continue to the speakers' list.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {PRESET_SECONDS.map((seconds) => (
          <button
            key={seconds}
            onClick={() => onSelect(seconds)}
            className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
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
              className="w-28 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
            />
            <button
              onClick={submitCustom}
              className="border border-[var(--app-border)] bg-[var(--app-cta-bg)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-cta-text)] transition hover:bg-[var(--app-cta-hover)]"
            >
              Start
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCustomOpen(true)}
            className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
          >
            More
          </button>
        )}
      </div>
    </div>
  );
}
