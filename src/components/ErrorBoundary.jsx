import { Component } from "react";
import { clearCommitteeCaches } from "../committeeCaches";
import { session } from "../utils/storage";

const CRASH_MARKER_KEY = "motion-crashed";
// A run this long without crashing proves the saved state is fine again.
const HEALTHY_AFTER_MS = 30_000;

// Last line of defense mid-session: a render crash shows a way back instead
// of a blank page. Dais state lives in sessionStorage, so a reload restores it.
export default class ErrorBoundary extends Component {
  state = { error: null, repeated: false, confirmingClear: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this.healthyTimer = setTimeout(() => session.remove(CRASH_MARKER_KEY), HEALTHY_AFTER_MS);
  }

  componentWillUnmount() {
    clearTimeout(this.healthyTimer);
  }

  // Crashing again before a healthy run means saved state itself is the
  // cause, so the fallback then offers to clear it rather than loop forever.
  componentDidCatch(error, info) {
    console.error("Motion hit an error it couldn't recover from:", error, info?.componentStack);
    clearTimeout(this.healthyTimer);
    if (session.get(CRASH_MARKER_KEY)) this.setState({ repeated: true });
    session.set(CRASH_MARKER_KEY, "1");
  }

  clearSavedLists = () => {
    clearCommitteeCaches();
    session.remove(CRASH_MARKER_KEY);
    window.location.reload();
  };

  render() {
    const { error, repeated, confirmingClear } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="app-shell flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
        <div className="w-full max-w-sm border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center">
          <div role="alert">
            <h2 className="text-lg font-medium">Something went wrong</h2>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              Your conference is still saved in this tab. Reload to pick up where you left off.
            </p>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              autoFocus
              onClick={() => window.location.reload()}
              className="flex-1 border border-[var(--app-border)] bg-[var(--app-cta-bg)] px-4 py-2.5 text-sm font-medium text-[var(--app-cta-text)] transition hover:bg-[var(--app-cta-hover)]"
            >
              Reload
            </button>
            <a
              href="/"
              className="flex-1 border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text-muted)] transition hover:bg-[var(--app-chip)]"
            >
              Home
            </a>
          </div>

          {repeated && (
            <div className="mt-5 border-t border-[var(--app-border)] pt-4">
              <p className="text-sm text-[var(--app-text-muted)]">
                Still stuck? Clear this tab's saved votes, motions, and speakers' lists. The conference and roll call are kept.
              </p>
              {confirmingClear ? (
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => this.setState({ confirmingClear: false })}
                    className="flex-1 border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text-muted)] transition hover:bg-[var(--app-chip)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={this.clearSavedLists}
                    className="flex-1 border border-[rgba(var(--danger-rgb),0.4)] px-4 py-2.5 text-sm text-[var(--danger)] transition hover:bg-[rgba(var(--danger-rgb),0.1)]"
                  >
                    Clear, can't undo
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => this.setState({ confirmingClear: true })}
                  className="mt-3 w-full border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip)]"
                >
                  Clear saved lists
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
