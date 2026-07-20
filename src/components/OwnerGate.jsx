import { useEffect, useState } from "react";
import AuthService from "../services/AuthService";
import { isAuthorizedUser } from "../services/ownerAccess";
import Logo from "./Logo";

// Gates its children to the owner/contributor allowlist (see ownerAccess.js) - used to lock
// down app.motionmun.com while it's in private early access. Same convenience-only gate as
// DebugPage/ReferPage, just shown as a sign-in screen instead of a redirect, since there's no
// other page on this subdomain to redirect an unauthorized visitor to.
export default function OwnerGate({ children }) {
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());
  const [signInError, setSignInError] = useState(null);

  useEffect(() => AuthService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthReady(AuthService.isReady());
  }), []);

  if (!authReady) return null;

  if (isAuthorizedUser(user)) return children;

  async function handleSignIn() {
    setSignInError(null);
    try {
      await AuthService.signInWithGoogle();
    } catch (error) {
      setSignInError(error.message);
    }
  }

  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-[#0d0d0d] p-6 text-white">
      <div className="w-full max-w-sm border border-white/10 bg-[#111111] p-8 text-center">
        <div className="flex justify-center">
          <Logo light />
        </div>

        <h1 className="mt-6 text-lg font-medium">Early Access</h1>

        <p className="mt-2 text-sm leading-relaxed text-white/45">
          Motion is in private early access. Sign in with an authorized account to continue.
        </p>

        <button
          onClick={handleSignIn}
          className="mt-6 w-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:border-white/20 hover:bg-white/10"
        >
          Sign in with Google
        </button>

        {signInError && (
          <p className="mt-3 text-xs text-[var(--danger)]">{signInError}</p>
        )}

        {user && (
          <p className="mt-4 text-xs text-white/30">
            Signed in as {user.email} — not authorized.
          </p>
        )}
      </div>
    </div>
  );
}
