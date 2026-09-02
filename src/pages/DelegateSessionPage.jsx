import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import Flag from "../components/Flag";
import Queue from "../components/Queue";
import { formatTime } from "../utils/formatTime";
import LiveSessionService from "../services/LiveSessionService";
import { useAnchoredCountdown } from "../hooks/useAnchoredCountdown";

// Anchored on the chair's published `timer.anchorAt` (a Firestore
// serverTimestamp, not the chair's own clock) so a wrong laptop clock can't
// skew every delegate's countdown. Re-anchors whenever the chair publishes a
// new timer state; interpolates locally in between via useAnchoredCountdown,
// the same math Timer.jsx itself uses.
function DelegateTimerDisplay({ timer }) {
  // Deps are the specific fields (not `timer` itself, a fresh object every
  // snapshot) so this - and the hook's anchor-tracking effect downstream -
  // only recomputes on a real published change.
  const hasTimer = Boolean(timer);
  const anchorAt = timer?.anchorAt;
  const anchorValue = timer?.anchorValue;
  const anchor = useMemo(
    () => (hasTimer ? { time: anchorAt?.toMillis?.() ?? 0, value: anchorValue } : null),
    [hasTimer, anchorAt, anchorValue]
  );

  const value = useAnchoredCountdown(anchor, Boolean(timer?.running));

  if (!timer) return null;

  return (
    <div className="text-center">
      <div
        className={`text-[3.25rem] font-light tracking-[-0.06em] sm:text-[4.25rem] ${
          timer.overtime ? "text-[var(--danger)]" : "text-[var(--app-text)]"
        }`}
      >
        {formatTime(Math.ceil(value ?? timer.anchorValue))}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--app-text-faint)]">
        {timer.overtime ? "Overtime" : "Remaining"}
      </div>
    </div>
  );
}

export default function DelegateSessionPage() {
  const { sessionId } = useParams();
  const [state, setState] = useState(null);

  useEffect(() => LiveSessionService.subscribe(sessionId, setState), [sessionId]);

  if (!state) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6 text-center text-[var(--app-text-muted)]">
        Waiting for the chair to go live&hellip;
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-5 text-[var(--app-text)] sm:p-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Active speech</p>
          <span className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--app-text-secondary)]">
            {state.activeMotionLabel ?? "No motion active"}
          </span>
        </div>

        <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center">
          <h1 className="flex items-center justify-center gap-3 text-2xl font-semibold tracking-[-0.03em]">
            <Flag countryCode={state.currentSpeaker?.countryCode} className="text-xl" />
            {state.currentSpeaker?.country ?? "No speaker selected"}
          </h1>

          <div className="mt-6">
            <DelegateTimerDisplay timer={state.timer} />
          </div>
        </div>

        {/* Queue.jsx's root is h-full/min-h-0, built for the flex-1 grid cell
            it fills on /session - a fixed height gives it the same definite
            box to scroll within here, where the page just flows normally. */}
        <div className="h-[50vh] min-h-[280px]">
          <Queue queue={state.queue ?? []} setQueue={() => {}} readOnly />
        </div>
      </div>
    </div>
  );
}
