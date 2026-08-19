import AppTopBar from "../components/AppTopBar";
import Timer from "../components/Timer";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";

// A bare standalone clock - no motion log, no queue, no committee-state
// wiring beyond the AppTopBar label. For a chair who just wants a timer
// running (a caucus, an informal, anything that isn't a logged speaker
// list) without any of that other bookkeeping. Starts at 3 minutes;
// double-clicking the ring (Timer's `editable` mode) lets a chair type in
// a different time directly rather than picking from a separate screen.
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
