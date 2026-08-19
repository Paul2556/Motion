import { formatDuration } from "../utils/duration";

// List of previously submitted motions (see MotionInput's onSubmit), newest
// first - a plain snapshot of each motion's parsed meta at submit time, so
// later edits to the committee roster/constants can't retroactively change
// what a chair already logged. `seconded` lives on the entry itself (set by
// MotionPage's "S" shortcut / onToggleSecond) rather than derived, since
// nothing else about a logged motion implies it.
export default function MotionLog({ entries, onDelete, onVote, onToggleSecond, selectedIndex = -1 }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`border p-4 transition ${
            i === selectedIndex ? "border-[var(--app-border-active)] bg-[var(--app-panel)]" : "border-[var(--app-border)] bg-[var(--app-panel)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--app-text)]">{entry.motion ?? "Untitled motion"}</h3>
            {entry.seconded && (
              <span className="border border-[var(--motion-accent)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--motion-accent)]">
                Seconded
              </span>
            )}
          </div>
          {entry.topic && <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">{entry.topic}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-[var(--app-text-secondary)]">
            <span>Proposer: {entry.delegation ?? "—"}</span>
            <span className="flex flex-wrap gap-x-4">
              {entry.totalTime != null && <span>{formatDuration(entry.totalTime)} total</span>}
              {entry.speakingTime != null && <span>{formatDuration(entry.speakingTime)} per speaker</span>}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onVote?.(entry)}
              className="border border-[var(--app-border)] px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
            >
              Voting
            </button>
            <button
              onClick={() => onToggleSecond?.(i)}
              className={`border px-4 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                entry.seconded
                  ? "border-[var(--motion-accent)] text-[var(--motion-accent)] hover:bg-[rgba(var(--motion-accent-rgb),0.1)]"
                  : "border-[var(--app-border)] text-[var(--app-text-secondary)] hover:bg-[var(--app-chip-active)]"
              }`}
            >
              {entry.seconded ? "Seconded" : "Second"}
            </button>
            <button
              onClick={() => onDelete?.(i)}
              className="border border-[rgba(var(--danger-rgb),0.4)] px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-[var(--danger)] outline-none transition hover:bg-[rgba(var(--danger-rgb),0.1)] focus-visible:border-[var(--danger)]"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
