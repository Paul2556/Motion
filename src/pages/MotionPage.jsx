import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Keyboard } from "lucide-react";
import Logo from "../components/Logo";
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
import { RESOLUTION_READING_MINUTES, MAIN_SUBMITTER_MINUTES } from "../constants";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

function voteStorageKey(committeeId) {
  return `motion-vote-${committeeId}`;
}

// sessionStorage, same reasoning as ConferenceService: survives a refresh,
// still gone once the tab closes. Ignores a cache whose total seat count no
// longer matches the roster (e.g. a re-imported workbook with a different size).
// Sums every group present (2 without abstain, 3 with it) rather than
// hardcoding indices, since group count now varies.
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

// Inserts a new motion-log entry immediately above the first existing entry
// whose rank is no more disruptive than it (so same-rank motions still read
// newest-first, and a highly disruptive new motion - e.g. a Point of Order -
// jumps straight to the top instead of just being prepended). An entry whose
// text the parser didn't recognize as any known motion sinks to the bottom.
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

  // Opening voting always starts the tally fresh - it's voting *on this
  // motion*, not a running total carried over from whatever was voted on
  // before it. Also marks it as the committee's active motion (a chair
  // reopening voting on an older logged motion is explicitly bringing it
  // back to the floor), which is what the /session timer's badge reads.
  function startVoting(entry) {
    setVotingMotion(entry);
    setGroups(buildInitialGroups(presentCount, absentCount));
    ConferenceService.setActiveMotion(entry);
  }

  // The most recently logged motion becomes the committee's active motion
  // too - most motions (procedural ones especially) govern the floor as
  // soon as they're moved, well before/without an explicit vote. Inserted by
  // precedence rather than prepended, so a highly disruptive motion (Point
  // of Order) always shows above a less disruptive one already on the floor.
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

  // Ad hoc utility, not tied to a logged/voted motion - same reasoning as
  // /vote's standalone tool. Reuses the exact plain-object shape a parsed
  // motion already has (see MotionInput.jsx's meta), so /session's existing
  // badge/timer wiring picks these up with no changes of its own.
  function startResolutionReading() {
    ConferenceService.setActiveMotion({ motion: "Resolution Reading Time", totalTime: RESOLUTION_READING_MINUTES });
    navigate("/session");
  }

  function startMainSubmitterSpeech() {
    ConferenceService.setActiveMotion({ motion: "Main Submitter Speech", speakingTime: MAIN_SUBMITTER_MINUTES });
    navigate("/session");
  }

  // Sets the chosen per-speaker time as the active motion (same field
  // /session already reads for the timer) and tells SessionPage to seed the
  // queue with the full roster, alphabetically - a one-time router-state
  // flag rather than persisted state, so a later refresh of /session doesn't
  // keep re-seeding over whatever the chair has done with the queue since.
  function startSpeakingTime(seconds) {
    ConferenceService.setActiveMotion({ motion: "Speakers' List", speakingTime: seconds / 60 });
    navigate("/session", { state: { seedQueue: true } });
  }

  function deleteMotion(index) {
    undoRef.current = { entry: motionLog[index], index };
    setMotionLog((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleSecond(index) {
    setMotionLog((prev) => prev.map((entry, i) => (i === index ? { ...entry, seconded: !entry.seconded } : entry)));
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

  // Voting is a fixed contextual override (spec: "cannot be remapped away")
  // - while votingMotion is set, 1/2/3/+/- go straight to these handlers
  // before the motions scope below ever sees them, reusing the exact same
  // select-bloc-then-adjust behavior this page already shipped (not the
  // "cast one vote per keypress" reading of the spec's literal wording -
  // that'd be a UX change to already-designed voting, not a shortcuts pass).
  useDaisShortcuts(
    "motions",
    {
      "motions.newMotion": () => motionInputRef.current?.focus(),
      "motions.second": () => selectedMotion && toggleSecond(clampedMotionIndex),
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
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-5xl">
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

        <div className={votingMotion ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" : "flex justify-center"}>
          <div className={`border border-white/10 bg-[#121212] p-6 ${votingMotion ? "" : "w-full max-w-2xl"}`}>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Motion text</p>

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
              onToggleSecond={toggleSecond}
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

        <div className="mt-6 border border-white/10 bg-[#121212] p-6">
          <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Resolution tools</p>
          <p className="mt-2 text-sm text-white/45">
            Quick timers for a just-introduced resolution - each jumps straight to the session
            timer with the right duration and label already set.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={startResolutionReading}
              className="border border-white/10 bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
            >
              Start Resolution Reading Time ({RESOLUTION_READING_MINUTES} min)
            </button>
            <button
              onClick={startMainSubmitterSpeech}
              className="border border-white/10 bg-white/5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10"
            >
              Start Main Submitter Speech ({MAIN_SUBMITTER_MINUTES} min)
            </button>
          </div>
        </div>

        <SpeakingTimeSelector onSelect={startSpeakingTime} />

        <p className="mt-8 text-center text-[11px] text-white/25">
          Source of motions are from the ThaiMUN RoP
        </p>
      </div>

      <ShortcutLegend scopeName="motions" open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}
