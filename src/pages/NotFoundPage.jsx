import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { APP_HOSTS, DEBUG_HOSTS, DEMO_HOSTS, DELEGATE_HOSTS } from "../hosts";

// Two variants matching the repo's two theme systems, so the 404 never
// clashes with whichever one owns the surrounding page.
function isProductSubdomain(hostname) {
  return (
    APP_HOSTS.includes(hostname) ||
    DEMO_HOSTS.includes(hostname) ||
    DEBUG_HOSTS.includes(hostname) ||
    DELEGATE_HOSTS.includes(hostname)
  );
}

function AppShellNotFound() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
      <div className="w-full max-w-sm border border-[var(--app-border)] bg-[var(--app-panel)] p-8 text-center">
        <div className="flex justify-center">
          <Logo light />
        </div>

        <h1 className="mt-6 text-lg font-medium">404: Page not found</h1>

        <p className="mt-2 text-sm leading-relaxed text-[var(--app-text-muted)]">
          That page doesn't exist.
        </p>

        <Link
          to="/"
          className="mt-6 block w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-2.5 text-sm transition hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ThemeShellNotFound() {
  const [darkMode] = useState(() => localStorage.getItem("motion-theme") === "dark");

  return (
    <div
      className={`theme-shell flex min-h-screen items-center justify-center p-6 text-[#101010] ${darkMode ? "theme-dark bg-black" : "bg-[#f4f4f0]"}`}
      data-theme={darkMode ? "dark" : "light"}
    >
      <div className={`w-full max-w-sm border p-8 text-center ${darkMode ? "border-white/10 bg-white/5" : "border-black/10 bg-white"}`}>
        <div className="flex justify-center">
          <Logo light={darkMode} />
        </div>

        <h1 className="mt-6 text-lg font-medium">404: Page not found</h1>

        <p className={`mt-2 text-sm leading-relaxed ${darkMode ? "text-white/45" : "text-black/45"}`}>
          That page doesn't exist.
        </p>

        <Link
          to="/"
          className={`mt-6 block w-full border px-4 py-2.5 text-sm transition ${darkMode ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10" : "border-black/10 bg-black/5 hover:border-black/20 hover:bg-black/10"}`}
        >
          Back to the landing page
        </Link>
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  return isProductSubdomain(window.location.hostname) ? <AppShellNotFound /> : <ThemeShellNotFound />;
}
