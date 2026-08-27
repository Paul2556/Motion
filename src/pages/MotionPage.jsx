import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../components/AppTopBar";
import MotionInput from "../components/MotionInput";
import MotionLog from "../components/MotionLog";
import VotingPanel from "../components/VotingPanel";
import SpeakingTimeSelector from "../components/SpeakingTimeSelector";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ShortcutLegend from "../components/ShortcutLegend";
import { formatMotionSummary } from "../utils/motionSummary";
import { buildInitialGroups, adjustVoteGroups, toggleAbstainGroups } from "../utils/voteGroups";
import ConferenceService from "../services/ConferenceService";
import { getMotions, canonicalLabel } from "../motionPresets";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

function voteStorageKey(committeeId) {
  return `motion-vote-${committeeId}`;
}

// sessionStorage so it survives a refresh but not the tab closing. Ignores a
// cache whose seat count no longer matches the roster, and sums every group
// present rather than hardcoding indices, since the count varies.
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

// Inserts by precedence, so a Point of Order jumps to the top while same-rank
// motions still read newest-first. Unrecognized text sinks to the bottom.
function insertByPrecedence(list, entry, precedenceByLabel) {
  const rank = entry.motion != null ? (precedenceByLabel.get(entry.motion) ?? Infinity) : Infinity;
  const at = list.findIndex((existing) => {
    const existingRank = existing.motion != null ? (precedenceByLabel.get(existing.motion) ?? Infinity) : Infinity;
    return existingRank >= rank;
  });
  const index = at === -1 ? list.length : at;
  return [...list.slice(0, index), entry, ...list.slice(index)];
}

export default function MotionPage() {
  const navigate = useNavigate();
  const committee = ConferenceService.getActiveCommittee();
  const delegateCount = committee?.delegates.length ?? 0;
  const presentCount = committee?.delegates.filter((d) => d.present).length ?? 0;
  const absentCount = delegateCount - presentCount;
  const cachedVote = committee ? loadCachedVote(committee.id, delegateCount) : null;

  // Scope MotionInput's matching to delegations actually in this committee
  // (including non-country ones like press corps), not the full ISO list.
  const delegations = committee?.delegates.map((d) => ({ name: d.countryDisplay, code: d.countryCode })) ?? [];

  // Read once per mount (see motionPresets.js) - used to rank the motion log
  // by precedence (array order = disruptiveness rank, see insertByPrecedence).
  const precedenceByLabel = useMemo(
    () => new Map(getMotions().map((m, i) => [canonicalLabel(m), i])),
    []
  );

  const [motionText, setMotionText] = useState(cachedVote?.motionText ?? "");
  const [groups, setGroups] = useState(cachedVote?.groups ?? buildInitialGroups(presentCount, absentCount));
  const [motionLog, setMotionLog] = useState(cachedVote?.motionLog ?? []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Hidden until a chair explicitly opens voting on a logged motion - null
  // means hidden, an entry means "voting is open for this motion".
  const [votingMotion, setVotingMotion] = useState(null);

  // Distinct from the vote-bloc `selectedIndex` above (different concept:
  // this is "which logged motion the keyboard cursor is on", kept separate
  // rather than conflated with it).
  const [selectedMotionIndex, setSelectedMotionIndex] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);
  const motionInputRef = useRef(null);
  // Single-slot undo (not a history stack) - same pattern as SessionBoard.jsx
  // and RollCallPage.jsx. Covers the last deleted motion only.
  const undoRef = useRef(null);

  const clampedMotionIndex = motionLog.length === 0 ? -1 : Math.min(selectedMotionIndex, motionLog.length - 1);
  const selectedMotion = clampedMotionIndex >= 0 ? motionLog[clampedMotionIndex] : null;

  // Opening voting starts a fresh tally rather than carrying one over, and
  // marks this as the active motion, since reopening an older motion means
  // bringing it back to the floor.
  function startVoting(entry) {
    setVotingMotion(entry);
    setGroups(buildInitialGroups(presentCount, absentCount));
    ConferenceService.setActiveMotion(entry);
  }

  // The newest motion becomes active immediately, since procedural motions
  // govern the floor as soon as they're moved. Inserted by precedence, so a
  // Point of Order outranks whatever is already on the floor.
  function handleMotionSubmit(meta) {
    setMotionLog((prev) => insertByPrecedence(prev, meta, precedenceByLabel));
    ConferenceService.setActiveMotion(meta);
  }

  // votingMotion is already the committee's active motion (set in
  // startVoting) - re-setting here is just belt-and-suspenders so /session
  // picks up this exact passed motion even if something else changed the
  // active motion mid-vote.
  function continueToSession() {
    ConferenceService.setActiveMotion(votingMotion);
    navigate("/session");
  }

  // Seeds the queue with the full roster via a one-time router-state flag
  // rather than persisted state, so refreshing /session doesn't re-seed over
  // whatever the chair has done since.
  function startSpeakingTime(seconds) {
    ConferenceService.setActiveMotion({ motion: "Speakers' List", speakingTime: seconds / 60 });
    navigate("/session", { state: { seedQueue: true } });
  }

  function deleteMotion(index) {
    undoRef.current = { entry: motionLog[index], index };
    setMotionLog((prev) => prev.filter((_, i) => i !== index));
  }

  // Clamped to [0, delegateCount] - can't log more seconds than there are
  // delegates in the committee. secondCount undefined (a freshly-submitted
  // entry) reads as 0, same as the old boolean `seconded` read as falsy.
  function adjustSecond(index, delta) {
    setMotionLog((prev) =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, secondCount: Math.max(0, Math.min(delegateCount, (entry.secondCount ?? 0) + delta)) }
          : entry
      )
    );
  }

  function performUndo() {
    const action = undoRef.current;
    if (!action) return;
    undoRef.current = null;
    setMotionLog((prev) => {
      const next = [...prev];
      next.splice(Math.min(action.index, next.length), 0, action.entry);
      return next;
    });
  }

  useEffect(() => {
    if (!committee) return;
    try {
      sessionStorage.setItem(voteStorageKey(committee.id), JSON.stringify({ motionText, groups, motionLog }));
    } catch {
      // storage unavailable (private browsing, quota) - falls back to in-memory-only
    }
  }, [committee, motionText, groups, motionLog]);

  const adjustVotes = useCallback((index, delta) => {
    setGroups((prev) => adjustVoteGroups(prev, index, delta));
  }, []);

  const allowAbstain = groups.length > 2;

  // Locked (a no-op) whenever anyone's absent - their seats are already
  // forced into Abstain (see voteGroups.js's buildInitialGroups) and folding
  // the group away would misrepresent them as real Against votes.
  function toggleAbstain() {
    if (absentCount > 0) return;
    setGroups((prev) => toggleAbstainGroups(prev));
  }

  // A fixed contextual override that can't be remapped away: while
  // votingMotion is set, 1/2/3/+/- reach these handlers before the motions
  // scope sees them, reusing the existing select-then-adjust behavior.
  useDaisShortcuts(
    "motions",
    {
      "motions.newMotion": () => motionInputRef.current?.focus(),
      "motions.second": () => selectedMotion && adjustSecond(clampedMotionIndex, 1),
      "motions.openVote": () => selectedMotion && startVoting(selectedMotion),
      "motions.confirm": () => selectedMotion && startVoting(selectedMotion),
      "motions.moveUp": () => setSelectedMotionIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1)),
      "motions.moveDown": () => setSelectedMotionIndex((i) => Math.min(motionLog.length - 1, (i < 0 ? -1 : i) + 1)),
      "global.undo": performUndo,
      "global.legend": () => setLegendOpen((open) => !open),
      "global.viewSpeakerList": () => navigate("/session"),
      "global.viewRollCall": () => navigate("/rollcall"),
      "global.viewGeneralVoting": () => navigate("/vote"),
    },
    {
      votingActive: Boolean(votingMotion),
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
      <div className="mx-auto max-w-5xl">
        <AppTopBar
          committeeLabel={committee?.committee ?? committee?.id}
          onShowShortcuts={() => setLegendOpen(true)}
        />

        <div className={votingMotion ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" : "flex justify-center"}>
          <div className={`border border-[var(--app-border)] bg-[var(--app-panel)] p-6 ${votingMotion ? "" : "w-full max-w-2xl"}`}>
            <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Motion text</p>

            <MotionInput
              ref={motionInputRef}
              value={motionText}
              onChange={setMotionText}
              placeholder="You can type as naturally as you want"
              rows={8}
              className="mt-4"
              delegations={delegations}
              onSubmit={handleMotionSubmit}
            />

            <MotionLog
              entries={motionLog}
              onDelete={deleteMotion}
              onVote={startVoting}
              onAdjustSecond={adjustSecond}
              maxSeconds={delegateCount}
              selectedIndex={clampedMotionIndex}
            />
          </div>

          {votingMotion && (
            <VotingPanel
              subtitle={formatMotionSummary(votingMotion)}
              groups={groups}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onIncrement={(index) => adjustVotes(index, 1)}
              onDecrement={(index) => adjustVotes(index, -1)}
              absentCount={absentCount}
              onToggleAbstain={toggleAbstain}
              onContinue={continueToSession}
            />
          )}
        </div>

        <SpeakingTimeSelector onSelect={startSpeakingTime} />

        <p className="mt-8 text-center text-[11px] text-[var(--app-text-faint)]">
          Source of motions are from the ThaiMUN RoP
        </p>
      </div>

      <ShortcutLegend scopeName="motions" open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}
