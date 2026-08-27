import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import AppTopBar from "../components/AppTopBar";
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

// A standalone vote for chairs who don't want to write a motion first,
// skipping MotionPage's full flow but reusing the same tally rules and
// absent-auto-abstain behavior.
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
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-2xl">
        <AppTopBar
          committeeLabel={committee?.committee ?? committee?.id}
          onShowShortcuts={() => setLegendOpen(true)}
        />

        <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">What's being voted on?</p>
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Optional - for your own reference"
            className="mt-4 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
          />

          <button
            onClick={resetTally}
            className="mt-4 flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
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
