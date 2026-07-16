import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import Logo from "../components/Logo";
import Flag from "../components/Flag";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";

const STATES = [
  { key: "absent", label: "Absent" },
  { key: "present", label: "Present" },
  { key: "voting", label: "Present & Voting" },
];

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

  // ConferenceService mutates delegate objects in place rather than emitting
  // change events, so this tick just forces a re-render after each mutation -
  // the subsequent read of committee.delegates picks up the fresh values.
  const [, setTick] = useState(0);
  const [pendingBulk, setPendingBulk] = useState(null);

  if (!committee) return <NoCommitteeModal />;

  // Sorted for display only (alphabetical roll call is the real-world
  // convention) - a local copy, not ConferenceService.sortDelegates(), so
  // this page doesn't reorder the roster everywhere else it's used.
  const delegates = [...committee.delegates].sort((a, b) =>
    (a.countryDisplay || a.country).localeCompare(b.countryDisplay || b.country)
  );

  const rosterSize = delegates.length;
  const presentCount = delegates.filter((d) => d.present).length;
  const votingCount = delegates.filter((d) => d.voting).length;

  const delegateStates = delegates.map(getDelegateState);
  const everyoneUniform = delegateStates.length > 0 && delegateStates.every((s) => s === delegateStates[0]);
  const everyoneState = everyoneUniform ? delegateStates[0] : null;

  function applyToDelegate(id, state) {
    ConferenceService.setAttendanceState(id, state);
    setTick((t) => t + 1);
  }

  function requestEveryone(nextState) {
    const changesCount = delegates.filter((d) => getDelegateState(d) !== nextState).length;

    if (shouldConfirmBulkChange(rosterSize, changesCount)) {
      setPendingBulk({ nextState, changesCount });
      return;
    }

    applyEveryone(nextState);
  }

  function applyEveryone(nextState) {
    ConferenceService.setAllAttendanceState(nextState);
    setPendingBulk(null);
    setTick((t) => t + 1);
  }

  const pendingLabel = pendingBulk && STATES.find((s) => s.key === pendingBulk.nextState)?.label;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <Logo compact light />
            </Link>
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Roll Call</span>
          </div>

          <Link
            to="/session"
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

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
            {delegates.map((delegate) => (
              <div key={delegate.id} className="flex items-center justify-between px-5 py-4">
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
    </div>
  );
}
