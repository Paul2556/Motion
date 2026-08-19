import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Flag from "../components/Flag";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";

function formatDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function StatCard({ label, value }) {
  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--app-text-muted)]">{label}</p>
    </div>
  );
}

export default function StatsPage() {
  const committee = ConferenceService.getActiveCommittee();

  if (!committee) return <NoCommitteeModal />;

  const stats = ConferenceService.getStatistics();

  // Descending by speaking time - delegates who haven't spoken yet naturally
  // sort to the bottom rather than needing a separate filter/sort pass.
  const ranked = [...committee.delegates].sort((a, b) => b.speakingTime - a.speakingTime);
  const maxSpeakingTime = ranked[0]?.speakingTime ?? 0;
  const hasAnySpeeches = maxSpeakingTime > 0;

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <Logo compact light />
            </Link>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--app-text-muted)]">Stats</span>
          </div>

          <Link
            to="/home"
            className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Delegates" value={stats.delegates} />
          <StatCard label="Present" value={stats.present} />
          <StatCard label="Absent" value={stats.absent} />
          <StatCard label="Spoken" value={stats.spoken} />
          <StatCard label="Remaining" value={stats.remaining} />
          <StatCard label="Total Speaking Time" value={formatDuration(stats.totalSpeakingTime)} />
          <StatCard label="Avg Speaking Time" value={formatDuration(stats.averageSpeakingTime)} />
        </div>

        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Speaking Time</p>

          {hasAnySpeeches ? (
            <div className="mt-5 space-y-3">
              {ranked.map((delegate) => (
                <div key={delegate.id} className="flex items-center gap-3">
                  <div className="flex w-40 shrink-0 items-center gap-2 truncate text-sm text-[var(--app-text-secondary)]">
                    <Flag countryCode={delegate.countryCode} className="text-base" />
                    <span className="truncate">{delegate.countryDisplay || delegate.country}</span>
                  </div>

                  <div className="h-2 flex-1 bg-[var(--app-chip)]">
                    <div
                      className="h-2 bg-[rgba(var(--motion-accent-rgb),0.8)]"
                      style={{ width: `${(delegate.speakingTime / maxSpeakingTime) * 100}%` }}
                    />
                  </div>

                  <span className="w-12 shrink-0 text-right text-sm text-[var(--app-text-muted)]">
                    {formatDuration(delegate.speakingTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--app-text-muted)]">No speeches recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
