import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { APP_HOSTS, DEBUG_HOSTS, DEMO_HOSTS } from "../hosts";

// Two visual variants matching this repo's two independent theme systems
// (see CLAUDE.md's Theming section) - a product subdomain gets the dark
// app-shell look, everything else (marketing domain, localhost/preview
// fallback) gets LandingPage's native light look, so the 404 never clashes
// with whichever theme system actually owns the surrounding page.
function isProductSubdomain(hostname) {
  return APP_HOSTS.includes(hostname) || DEMO_HOSTS.includes(hostname) || DEBUG_HOSTS.includes(hostname);
}

function AppShellNotFound() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center bg-[#0d0d0d] p-6 text-white">
      <div className="w-full max-w-sm border border-white/10 bg-[#111111] p-8 text-center">
        <div className="flex justify-center">
          <Logo light />
        </div>

        <h1 className="mt-6 text-lg font-medium">404 — Page not found</h1>

        <p className="mt-2 text-sm leading-relaxed text-white/45">
          That page doesn't exist.
        </p>

        <Link
          to="/"
          className="mt-6 block w-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm transition hover:border-white/20 hover:bg-white/10"
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

        <h1 className="mt-6 text-lg font-medium">404 — Page not found</h1>

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
