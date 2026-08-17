import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import AppTopBar from "../components/AppTopBar";
import Flag from "../components/Flag";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ShortcutLegend from "../components/ShortcutLegend";
import ConferenceService from "../services/ConferenceService";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

const STATES = [
  { key: "absent", label: "Absent" },
  { key: "present", label: "Present" },
  { key: "voting", label: "Present & Voting" },
];

const STATE_ORDER = STATES.map((s) => s.key);

// No wraparound (locked spec decision) - cycling stops at each end instead
// of looping back around.
function cycleState(current, direction) {
  const next = STATE_ORDER.indexOf(current) + direction;
  return next < 0 || next >= STATE_ORDER.length ? current : STATE_ORDER[next];
}

function getDelegateState(delegate) {
  if (!delegate.present) return "absent";
  return delegate.voting ? "voting" : "present";
}

// Pure and standalone so a future "apply to all" action (bulk speaking time,
// clear-all-motions) can reuse this without depending on roll call at all -
// only counts rows that would actually flip, not every row, and a roster
// under 10 never needs confirming regardless of how many would change.
// Not exported yet since nothing else needs it - move it to a shared utils
// file the moment a second bulk-action feature actually wants it.
function shouldConfirmBulkChange(rosterSize, changesCount) {
  if (rosterSize < 10) return false;
  return changesCount >= Math.floor(rosterSize * 0.25);
}

function SegmentedToggle({ value, onChange, indeterminate = false }) {
  return (
    <div className="flex shrink-0 border border-white/10">
      {STATES.map((state, index) => {
        const active = !indeterminate && value === state.key;
        return (
          <button
            key={state.key}
            onClick={() => onChange(state.key)}
            className={`px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition ${
              index > 0 ? "border-l border-white/10" : ""
            } ${active ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
          >
            {state.label}
          </button>
        );
      })}
    </div>
  );
}

export default function RollCallPage() {
  const committee = ConferenceService.getActiveCommittee();
  const navigate = useNavigate();

  // ConferenceService mutates delegate objects in place rather than emitting
  // change events, so this tick just forces a re-render after each mutation -
  // the subsequent read of committee.delegates picks up the fresh values.
  const [, setTick] = useState(0);
  const [pendingBulk, setPendingBulk] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);
  // Single-slot undo (not a history stack) - see SessionBoard.jsx's
  // undoRef for the same pattern. Covers both an individual toggle and a
  // bulk "everyone" change (as a list of every delegate's prior state).
  const undoRef = useRef(null);

  // Sorted for display only (alphabetical roll call is the real-world
  // convention) - a local copy, not ConferenceService.sortDelegates(), so
  // this page doesn't reorder the roster everywhere else it's used. Falls
  // back to [] (rather than being skipped) so the hooks below stay
  // unconditional even before the `!committee` check.
  const delegates = committee
    ? [...committee.delegates].sort((a, b) => (a.countryDisplay || a.country).localeCompare(b.countryDisplay || b.country))
    : [];

  const clampedIndex = delegates.length === 0 ? -1 : Math.min(selectedIndex, delegates.length - 1);
  const selectedDelegate = clampedIndex >= 0 ? delegates[clampedIndex] : null;

  // Keyboard nav (rollCall.moveUp/moveDown) can move the selection past the edge of the
  // scrollable roster without this - the row itself would still update, just silently
  // off-screen. "nearest" only scrolls the minimum needed to reveal it, so it doesn't yank
  // the list around when the row's already visible.
  const rowRefs = useRef([]);
  useEffect(() => {
    rowRefs.current[clampedIndex]?.scrollIntoView({ block: "nearest" });
  }, [clampedIndex]);

  function applyToDelegate(id, state) {
    const delegate = delegates.find((d) => d.id === id);
    if (delegate) {
      undoRef.current = { changes: [{ id, previousState: getDelegateState(delegate) }] };
    }
    ConferenceService.setAttendanceState(id, state);
    setTick((t) => t + 1);
  }

  function requestEveryone(nextState) {
    const changesCount = delegates.filter((d) => getDelegateState(d) !== nextState).length;

    if (shouldConfirmBulkChange(delegates.length, changesCount)) {
      setPendingBulk({ nextState, changesCount });
      return;
    }

    applyEveryone(nextState);
  }

  function performUndo() {
    const action = undoRef.current;
    if (!action) return;
    undoRef.current = null;
    action.changes.forEach(({ id, previousState }) => ConferenceService.setAttendanceState(id, previousState));
    setTick((t) => t + 1);
  }

  useDaisShortcuts(
    "rollCall",
    {
      "rollCall.moveUp": () => setSelectedIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1)),
      "rollCall.moveDown": () => setSelectedIndex((i) => Math.min(delegates.length - 1, (i < 0 ? -1 : i) + 1)),
      "rollCall.cycleNext": () =>
        selectedDelegate && applyToDelegate(selectedDelegate.id, cycleState(getDelegateState(selectedDelegate), 1)),
      "rollCall.cyclePrev": () =>
        selectedDelegate && applyToDelegate(selectedDelegate.id, cycleState(getDelegateState(selectedDelegate), -1)),
      "rollCall.setAbsent": () => selectedDelegate && applyToDelegate(selectedDelegate.id, "absent"),
      "rollCall.setPresent": () => selectedDelegate && applyToDelegate(selectedDelegate.id, "present"),
      "rollCall.setPresentVoting": () => selectedDelegate && applyToDelegate(selectedDelegate.id, "voting"),
      "rollCall.bulkPresent": () => requestEveryone("present"),
      "rollCall.confirmModal": () => pendingBulk && applyEveryone(pendingBulk.nextState),
      "rollCall.cancelModal": () => setPendingBulk(null),
      "global.undo": performUndo,
      "global.legend": () => setLegendOpen((open) => !open),
      "global.viewSpeakerList": () => navigate("/session"),
      "global.viewMotions": () => navigate("/motion"),
      "global.viewGeneralVoting": () => navigate("/vote"),
    },
    { active: Boolean(committee) }
  );

  if (!committee) return <NoCommitteeModal />;

  const rosterSize = delegates.length;
  const presentCount = delegates.filter((d) => d.present).length;
  const votingCount = delegates.filter((d) => d.voting).length;

  const delegateStates = delegates.map(getDelegateState);
  const everyoneUniform = delegateStates.length > 0 && delegateStates.every((s) => s === delegateStates[0]);
  const everyoneState = everyoneUniform ? delegateStates[0] : null;

  function applyEveryone(nextState) {
    undoRef.current = { changes: delegates.map((d) => ({ id: d.id, previousState: getDelegateState(d) })) };
    ConferenceService.setAllAttendanceState(nextState);
    setPendingBulk(null);
    setTick((t) => t + 1);
  }

  const pendingLabel = pendingBulk && STATES.find((s) => s.key === pendingBulk.nextState)?.label;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-3xl">

        <AppTopBar
          committeeLabel={committee?.committee ?? committee?.id}
          onShowShortcuts={() => setLegendOpen(true)}
        />

        <div className="mb-6 flex items-center gap-6 border border-white/10 bg-[#111111] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Present</p>
            <p className="mt-1 text-2xl font-light">{presentCount} <span className="text-sm text-white/30">/ {rosterSize}</span></p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Voting</p>
            <p className="mt-1 text-2xl font-light">{votingCount} <span className="text-sm text-white/30">/ {rosterSize}</span></p>
          </div>
        </div>

        <div className="border border-white/10 bg-[#111111]">

          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4">
            <span className="text-sm font-medium uppercase tracking-[0.1em] text-white/70">Everyone</span>
            <SegmentedToggle value={everyoneState} indeterminate={!everyoneUniform} onChange={requestEveryone} />
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
            {delegates.map((delegate, index) => (
              <div
                key={delegate.id}
                ref={(el) => (rowRefs.current[index] = el)}
                onClick={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-5 py-4 transition ${
                  index === clampedIndex ? "bg-white/5" : ""
                }`}
              >
                <span className="flex items-center gap-2.5 font-medium">
                  <Flag countryCode={delegate.countryCode} className="text-lg" />
                  {delegate.countryDisplay || delegate.country}
                </span>
                <SegmentedToggle value={getDelegateState(delegate)} onChange={(state) => applyToDelegate(delegate.id, state)} />
              </div>
            ))}

            {delegates.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-white/40">No delegates in this committee.</p>
            )}
          </div>
        </div>

      </div>

      {pendingBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center gap-3">
              <Check size={20} className="text-white/50" />
              <h2 className="text-lg font-medium">Apply to everyone?</h2>
            </div>

            <p className="mt-4 text-sm text-white/60">
              This will change <strong className="text-white">{pendingBulk.changesCount}</strong> {pendingBulk.changesCount === 1 ? "delegate" : "delegates"} to <strong className="text-white">{pendingLabel}</strong>.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPendingBulk(null)}
                className="flex-1 border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => applyEveryone(pendingBulk.nextState)}
                className="flex-1 border border-white/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ShortcutLegend scopeName="rollCall" open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}
