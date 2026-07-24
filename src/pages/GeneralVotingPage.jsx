import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Keyboard, RotateCcw } from "lucide-react";
import Logo from "../components/Logo";
import VotingPanel from "../components/VotingPanel";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ShortcutLegend from "../components/ShortcutLegend";
import { buildInitialGroups, adjustVoteGroups, toggleAbstainGroups } from "../utils/voteGroups";
import ConferenceService from "../services/ConferenceService";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

function voteStorageKey(committeeId) {
  return `general-vote-${committeeId}`;
}

// Same cache-validity reasoning as MotionPage.jsx's loadCachedVote - ignores
// a cache whose total no longer matches the roster.
function loadCachedVote(committeeId, delegateCount) {
  try {
    const raw = sessionStorage.getItem(voteStorageKey(committeeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const total = (parsed.groups ?? []).reduce((sum, group) => sum + (group.seats ?? 0), 0);
    return total === delegateCount ? parsed : null;
  } catch {
    return null;
  }
}

// A standalone voting module for chairs who just want to run a vote without
// writing it up as a motion first (see MotionPage.jsx for the full
// motion-text -> vote flow this deliberately skips). No motion log, no
// active-motion wiring - just the same tally rules (voteGroups.js) and the
// same absent-delegates-auto-abstain behavior.
export default function GeneralVotingPage() {
  const committee = ConferenceService.getActiveCommittee();
  const delegateCount = committee?.delegates.length ?? 0;
  const presentCount = committee?.delegates.filter((d) => d.present).length ?? 0;
  const absentCount = delegateCount - presentCount;
  const cachedVote = committee ? loadCachedVote(committee.id, delegateCount) : null;

  const [label, setLabel] = useState(cachedVote?.label ?? "");
  const [groups, setGroups] = useState(cachedVote?.groups ?? buildInitialGroups(presentCount, absentCount));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    if (!committee) return;
    try {
      sessionStorage.setItem(voteStorageKey(committee.id), JSON.stringify({ label, groups }));
    } catch {
      // storage unavailable (private browsing, quota) - falls back to in-memory-only
    }
  }, [committee, label, groups]);

  const adjustVotes = useCallback((index, delta) => {
    setGroups((prev) => adjustVoteGroups(prev, index, delta));
  }, []);

  const allowAbstain = groups.length > 2;

  function toggleAbstain() {
    if (absentCount > 0) return;
    setGroups((prev) => toggleAbstainGroups(prev));
  }

  function resetTally() {
    setGroups(buildInitialGroups(presentCount, absentCount));
  }

  useDaisShortcuts(
    "generalVoting",
    { "global.legend": () => setLegendOpen((open) => !open) },
    {
      votingActive: true,
      voteHandlers: {
        "voting.selectFor": () => setSelectedIndex(0),
        "voting.selectAgainst": () => setSelectedIndex(1),
        "voting.selectAbstain": () => allowAbstain && setSelectedIndex(2),
        "voting.increment": () => adjustVotes(selectedIndex, 1),
        "voting.decrement": () => adjustVotes(selectedIndex, -1),
      },
    }
  );

  if (!committee) return <NoCommitteeModal />;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Link to="/home" className="flex items-center gap-3">
            <Logo light />
          </Link>
          <button
            onClick={() => setLegendOpen(true)}
            aria-label="Keyboard shortcuts"
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <Keyboard size={14} />
          </button>
        </header>

        <div className="border border-white/10 bg-[#121212] p-6">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">What's being voted on?</p>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Optional - for your own reference"
            className="mt-4 w-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          />

          <button
            onClick={resetTally}
            className="mt-4 flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <RotateCcw size={12} /> Reset tally
          </button>
        </div>

        <div className="mt-6">
          <VotingPanel
            subtitle={label}
            groups={groups}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onIncrement={(index) => adjustVotes(index, 1)}
            onDecrement={(index) => adjustVotes(index, -1)}
            absentCount={absentCount}
            onToggleAbstain={toggleAbstain}
          />
        </div>
      </div>

      <ShortcutLegend scopeName="generalVoting" open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}
