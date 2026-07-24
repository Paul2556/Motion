import { ArrowRight, Minus, Plus } from "lucide-react";
import SeatChart from "./SeatChart";
import { getVoteStatusLabel } from "../utils/voteStatus";

// The voting module shared by MotionPage.jsx (voting on a logged motion) and
// GeneralVotingPage.jsx (a standalone vote with no motion attached) - the
// abstain toggle/note, majority-status label, seat chart, and manual abstain
// row are identical between the two; only what surrounds this panel differs
// (a "Continue to session" button on Motion's flow, nothing on General
// Voting's ad hoc one - see `onContinue`).
//
// `absentCount` locks the "Allow abstentions" toggle whenever there are
// absent delegates - their seats are already forced into Abstain (see
// src/utils/voteGroups.js's buildInitialGroups) and folding the group away
// would misrepresent them as real Against votes.
export default function VotingPanel({
  subtitle,
  groups,
  selectedIndex,
  onSelect,
  onIncrement,
  onDecrement,
  absentCount,
  onToggleAbstain,
  onContinue,
}) {
  const allowAbstain = groups.length > 2;
  const voteStatus = getVoteStatusLabel([groups[0], groups[1]]);
  const abstainLocked = absentCount > 0;

  return (
    <div className="border border-white/10 bg-[#121212] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-white/50">Allow abstentions</p>
          {abstainLocked && (
            <p className="mt-0.5 text-[11px] text-white/35">
              {absentCount} absent delegate{absentCount === 1 ? "" : "s"} auto-abstain
            </p>
          )}
        </div>

        <button
          onClick={onToggleAbstain}
          disabled={abstainLocked}
          role="switch"
          aria-checked={allowAbstain}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
            allowAbstain ? "border-white/40 bg-white/30" : "border-white/10 bg-white/5"
          } ${abstainLocked ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              allowAbstain ? "translate-x-[22px]" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {voteStatus === "Full House" && (
        <p className="mb-3 text-center text-2xl font-bold uppercase tracking-normal text-[var(--motion-accent)] whitespace-nowrap">
          Full House
        </p>
      )}
      {voteStatus === "Super Majority" && (
        <p className="mb-3 text-center text-2xl uppercase tracking-normal text-[rgba(var(--motion-accent-rgb),0.8)] whitespace-nowrap">
          Supermajority
        </p>
      )}
      {voteStatus === "Simple Majority" && (
        <p className="mb-3 text-center text-2xl uppercase tracking-normal text-white/45 whitespace-nowrap">
          Simple Majority
        </p>
      )}

      {voteStatus && onContinue && (
        <button
          onClick={onContinue}
          className="mb-5 flex w-full items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium uppercase tracking-[0.14em] transition hover:border-white/20 hover:bg-white/10"
        >
          Continue to session
          <ArrowRight size={15} />
        </button>
      )}

      <SeatChart
        title="Voting"
        subtitle={subtitle}
        groups={[groups[0], groups[1]]}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        onIncrement={(index) => onIncrement(index)}
        onDecrement={(index) => onDecrement(index)}
      />

      {allowAbstain && (
        <div className="-mx-2 mt-2 flex items-center justify-between border-t border-white/5 px-2 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: groups[2].color }} />
            <span className="text-sm text-white/80">Abstain</span>
            <span className="rounded-none border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
              3
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-10 text-right text-sm text-white/50">{groups[2].seats}</span>

            <div className="flex gap-1">
              <button
                onClick={() => onDecrement(2)}
                aria-label="Decrease Abstain votes"
                className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
              >
                <Minus size={12} />
              </button>

              <button
                onClick={() => onIncrement(2)}
                aria-label="Increase Abstain votes"
                className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
