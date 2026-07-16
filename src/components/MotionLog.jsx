// List of previously submitted motions (see MotionInput's onSubmit), newest
// first - a plain snapshot of each motion's parsed meta at submit time, so
// later edits to the committee roster/constants can't retroactively change
// what a chair already logged.
export default function MotionLog({ entries, onDelete, onVote }) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="border border-white/10 bg-[#121212] p-4">
          <h3 className="text-base font-semibold text-white">{entry.motion ?? "Untitled motion"}</h3>
          {entry.topic && <p className="mt-0.5 text-sm text-white/50">{entry.topic}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-white/60">
            <span>Proposer: {entry.delegation ?? "—"}</span>
            <span className="flex flex-wrap gap-x-4">
              {entry.totalTime != null && <span>{entry.totalTime} min total</span>}
              {entry.speakingTime != null && <span>{entry.speakingTime} min per speaker</span>}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onVote?.(entry)}
              className="border border-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-white/60 transition hover:bg-white/10"
            >
              Voting
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
