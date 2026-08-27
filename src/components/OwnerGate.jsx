import { useState } from "react";
import AuthService from "../services/AuthService";
import { usePagePermission } from "../services/permissions";
import Logo from "./Logo";

// Gates children on the "app" permission while the app is in private early
// access. Shown as a sign-in screen rather than a redirect, since there's no
// other page on this subdomain to send an unauthorized visitor to.
export default function OwnerGate({ children }) {
  const { allowed, ready } = usePagePermission("app");
  const [signInError, setSignInError] = useState(null);

  if (!ready) return null;

  if (allowed) return children;

  const user = AuthService.getCurrentUser();

  async function handleSignIn() {
    setSignInError(null);
    try {
      await AuthService.signInWithGoogle();
    } catch (error) {
      setSignInError(error.message);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
      <div className="w-full max-w-sm border border-[var(--app-border)] bg-[var(--app-panel)] p-8 text-center">
        <div className="flex justify-center">
          <Logo light />
        </div>

        <h1 className="mt-6 text-lg font-medium">Early Access</h1>

        <p className="mt-2 text-sm leading-relaxed text-[var(--app-text-muted)]">
          Motion is in private early access. Sign in with an authorized account to continue.
        </p>

        <button
          onClick={handleSignIn}
          className="mt-6 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-sm transition hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
        >
          Sign in with Google
        </button>

        {signInError && (
          <p className="mt-3 text-xs text-[var(--danger)]">{signInError}</p>
        )}

        {user && (
          <p className="mt-4 text-xs text-[var(--app-text-faint)]">
            Signed in as {user.email}. Not authorized.
          </p>
        )}
      </div>
    </div>
  );
}
