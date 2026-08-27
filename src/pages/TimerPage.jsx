import AppTopBar from "../components/AppTopBar";
import Timer from "../components/Timer";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";

// A bare standalone clock for a chair who just wants a timer running, with no
// queue or motion-log bookkeeping. Double-clicking the ring types in a
// different time directly.
export default function TimerPage() {
  const committee = ConferenceService.getActiveCommittee();

  if (!committee) return <NoCommitteeModal />;

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-2xl">
        <AppTopBar committeeLabel={committee?.committee ?? committee?.id} />

        <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Timer</p>

          <div className="mt-8 flex justify-center">
            <Timer initialTime={180} editable />
          </div>

          <p className="mt-6 text-center text-[11px] text-[var(--app-text-faint)]">
            Double-click the timer to type in a new time
          </p>
        </div>
      </div>
    </div>
  );
}
