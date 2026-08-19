import { useNavigate } from "react-router-dom";

export default function NoCommitteeModal() {
  const navigate = useNavigate();

  // This is often a page's entire render (see SessionPage.jsx's guard
  // comment), so it needs its own .app-shell wrapper - without one, no
  // .app-shell ever mounts and the light theme's CSS never matches, leaving
  // this stuck on the dark palette regardless of the chair's actual setting.
  return (
    <div className="app-shell fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] p-6">
      <div className="w-full max-w-sm border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center text-[var(--app-text)]">
        <p className="text-lg font-medium">No committee is loaded</p>
        <p className="mt-2 text-sm text-[var(--app-text-muted)]">Load a conference workbook first.</p>

        <button
          onClick={() => navigate("/home")}
          className="mt-5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-sm uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
