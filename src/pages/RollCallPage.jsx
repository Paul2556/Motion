import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import AppTopBar from "../components/AppTopBar";
import DelegateRoster from "../components/DelegateRoster";
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

// Counts only rows that would actually flip, and a roster under 10 never
// needs confirming. Kept pure and unexported so a second bulk action can lift
// it into utils when one exists.
function shouldConfirmBulkChange(rosterSize, changesCount) {
  if (rosterSize < 10) return false;
  return changesCount >= Math.floor(rosterSize * 0.25);
}

function SegmentedToggle({ value, onChange, indeterminate = false }) {
  return (
    <div className="flex shrink-0 border border-[var(--app-border)]">
      {STATES.map((state, index) => {
        const active = !indeterminate && value === state.key;
        return (
          <button
            key={state.key}
            onClick={() => onChange(state.key)}
            className={`px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition ${
              index > 0 ? "border-l border-[var(--app-border)]" : ""
            } ${active ? "bg-[var(--app-cta-bg)] text-[var(--app-cta-text)]" : "bg-[var(--app-chip)] text-[var(--app-text-muted)] hover:bg-[var(--app-chip-active)]"}`}
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

  // A local sorted copy, so alphabetical display here doesn't reorder the
  // roster everywhere else. Falls back to [] so the hooks below stay
  // unconditional before the `!committee` check.
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
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-3xl">

        <AppTopBar
          committeeLabel={committee?.committee ?? committee?.id}
          onShowShortcuts={() => setLegendOpen(true)}
        />

        <div className="mb-6 flex items-center gap-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Present</p>
            <p className="mt-1 text-2xl font-light">{presentCount} <span className="text-sm text-[var(--app-text-faint)]">/ {rosterSize}</span></p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Voting</p>
            <p className="mt-1 text-2xl font-light">{votingCount} <span className="text-sm text-[var(--app-text-faint)]">/ {rosterSize}</span></p>
          </div>
        </div>

        <div className="border border-[var(--app-border)] bg-[var(--app-panel)]">

          <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-chip)] px-5 py-4">
            <span className="text-sm font-medium uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">Everyone</span>
            <SegmentedToggle value={everyoneState} indeterminate={!everyoneUniform} onChange={requestEveryone} />
          </div>

          <DelegateRoster
            delegates={delegates}
            selectedIndex={clampedIndex}
            onSelectIndex={setSelectedIndex}
            rowRefs={rowRefs}
            renderRight={(delegate) => (
              <SegmentedToggle value={getDelegateState(delegate)} onChange={(state) => applyToDelegate(delegate.id, state)} />
            )}
          />
        </div>

      </div>

      {pendingBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] p-6">
          <div className="w-full max-w-md border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
            <div className="flex items-center gap-3">
              <Check size={20} className="text-[var(--app-text-muted)]" />
              <h2 className="text-lg font-medium">Apply to everyone?</h2>
            </div>

            <p className="mt-4 text-sm text-[var(--app-text-secondary)]">
              This will change <strong className="text-[var(--app-text)]">{pendingBulk.changesCount}</strong> {pendingBulk.changesCount === 1 ? "delegate" : "delegates"} to <strong className="text-[var(--app-text)]">{pendingLabel}</strong>.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPendingBulk(null)}
                className="flex-1 border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text-muted)] transition hover:bg-[var(--app-chip)]"
              >
                Cancel
              </button>
              <button
                onClick={() => applyEveryone(pendingBulk.nextState)}
                className="flex-1 border border-[var(--app-border)] bg-[var(--app-cta-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-cta-text)] transition hover:bg-[var(--app-cta-hover)]"
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
