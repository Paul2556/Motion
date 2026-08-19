import { useState } from "react";
import { RotateCcw } from "lucide-react";
import AppTopBar from "../components/AppTopBar";
import Timer from "../components/Timer";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";

const PRESET_SECONDS = [60, 75, 90, 120];

// A bare standalone clock - no motion log, no queue, no committee-state
// wiring beyond the AppTopBar label. For a chair who just wants a timer
// running (a caucus, an informal, anything that isn't a logged speaker
// list) without any of that other bookkeeping.
export default function TimerPage() {
  const committee = ConferenceService.getActiveCommittee();
  const [duration, setDuration] = useState(null);
  const [customValue, setCustomValue] = useState("");

  function submitCustom() {
    const seconds = Number(customValue);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    setDuration(Math.round(seconds));
  }

  if (!committee) return <NoCommitteeModal />;

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-2xl">
        <AppTopBar committeeLabel={committee?.committee ?? committee?.id} />

        {duration == null ? (
          <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Timer</p>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">Choose a duration to start.</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {PRESET_SECONDS.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setDuration(seconds)}
                  className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
                >
                  {seconds} Seconds
                </button>
              ))}

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && submitCustom()}
                  placeholder="Custom seconds..."
                  className="w-36 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
                />
                <button
                  onClick={submitCustom}
                  className="border border-[var(--app-border)] bg-[var(--app-cta-bg)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-cta-text)] transition hover:bg-[var(--app-cta-hover)]"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Timer</p>
              <button
                onClick={() => setDuration(null)}
                className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
              >
                <RotateCcw size={12} /> Change duration
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <Timer key={duration} initialTime={duration} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
