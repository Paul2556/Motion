import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Moon, RotateCcw, Sun } from "lucide-react";

import Logo from "../components/Logo";
import MotionPresetManager from "../components/MotionPresetManager";
import { getAppTheme, setAppTheme, getAppReducedMotion, setAppReducedMotion } from "../appTheme";
import AuthService from "../services/AuthService";
import { SHORTCUT_SCOPES, REMAPPABLE_SCOPES } from "../shortcuts";
import { getShortcutOverride, setShortcutOverride, clearShortcutOverride, resolveKey, keyIdToDisplay } from "../shortcutPrefs";
import { eventToKeyId } from "../hooks/useDaisShortcuts";

const SCOPE_TITLES = {
  global: "Global",
  speakerList: "Speaker List",
  motions: "Motions",
  rollCall: "Roll Call",
};

function scopeOf(actionId) {
  return actionId.split(".")[0];
}

// Collisions are only checked within the same scope + global (per-view
// scoping, not globally unique) - the same key can mean different things
// in different views, since only one view is ever active at once.
function findCollision(actionId, keyId) {
  const scope = scopeOf(actionId);
  const candidates = [...SHORTCUT_SCOPES.global, ...(SHORTCUT_SCOPES[scope] ?? [])];
  const hit = candidates.find((action) => action.id !== actionId && resolveKey(action.id) === keyId);
  return hit ? { label: hit.label } : null;
}

function ShortcutRemapList() {
  const [, setTick] = useState(0);
  const [capturingId, setCapturingId] = useState(null);
  const [collision, setCollision] = useState(null);

  useEffect(() => {
    if (!capturingId) return undefined;

    function handleCapture(event) {
      event.preventDefault();

      if (event.key === "Escape") {
        setCapturingId(null);
        setCollision(null);
        return;
      }

      const keyId = eventToKeyId(event);
      const conflict = findCollision(capturingId, keyId);
      if (conflict) {
        setCollision(conflict);
        return;
      }

      setShortcutOverride(capturingId, keyId);
      setCapturingId(null);
      setCollision(null);
      setTick((t) => t + 1);
    }

    // Capture phase so this reliably wins even while focus is inside the
    // page (nothing else on Settings needs raw keydown).
    window.addEventListener("keydown", handleCapture, true);
    return () => window.removeEventListener("keydown", handleCapture, true);
  }, [capturingId]);

  return (
    <div className="space-y-5">
      {REMAPPABLE_SCOPES.map((scope) => (
        <div key={scope}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{SCOPE_TITLES[scope]}</p>
          <div className="mt-2 space-y-1.5">
            {SHORTCUT_SCOPES[scope].map((action) => {
              const isCapturing = capturingId === action.id;
              const hasOverride = Boolean(getShortcutOverride(action.id));

              return (
                <div key={action.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-white/70">{action.label}</span>
                  <div className="flex items-center gap-2">
                    {hasOverride && (
                      <button
                        onClick={() => {
                          clearShortcutOverride(action.id);
                          setTick((t) => t + 1);
                        }}
                        aria-label={`Reset ${action.label} to default`}
                        className="text-white/30 transition hover:text-white/60"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setCapturingId(action.id);
                        setCollision(null);
                      }}
                      className={`min-w-[6.5rem] border px-2 py-1 text-center font-mono text-xs transition ${
                        isCapturing
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {isCapturing ? "Press a key…" : keyIdToDisplay(resolveKey(action.id))}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {capturingId && (
        <p className="text-xs text-white/35">
          {collision ? `Already used by "${collision.label}" in this view - press a different key, or Esc to cancel.` : "Press any key to bind it, or Esc to cancel."}
        </p>
      )}
    </div>
  );
}

function ThemeOption({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-3 border p-6 transition ${
        active
          ? "border-white/40 bg-white/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/20">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {active && (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
          <Check size={12} /> Active
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [theme, setTheme] = useState(getAppTheme);
  const [reducedMotion, setReducedMotion] = useState(getAppReducedMotion);
  const [user, setUser] = useState(() => AuthService.getCurrentUser());

  useEffect(() => AuthService.subscribe(setUser), []);

  function chooseTheme(next) {
    setTheme(next);
    setAppTheme(next);
  }

  function toggleReducedMotion() {
    const next = !reducedMotion;
    setReducedMotion(next);
    setAppReducedMotion(next);
  }

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <Logo compact light />
            </Link>
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Settings</span>
          </div>

          <Link
            to="/home"
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

        <div className="border border-white/10 bg-[#111111] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Theme</p>
          <p className="mt-2 text-sm text-white/45">Choose how Motion looks across the app.</p>

          <div className="mt-5 flex gap-4">
            <ThemeOption
              label="Black"
              icon={<Moon size={18} />}
              active={theme === "dark"}
              onClick={() => chooseTheme("dark")}
            />
            <ThemeOption
              label="White"
              icon={<Sun size={18} />}
              active={theme === "light"}
              onClick={() => chooseTheme("light")}
            />
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-[#111111] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">Reduced motion</p>
              <p className="mt-2 text-sm text-white/45">Turn off transitions and animations across the app.</p>
            </div>

            <button
              onClick={toggleReducedMotion}
              role="switch"
              aria-checked={reducedMotion}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                reducedMotion ? "border-white/40 bg-white/30" : "border-white/10 bg-white/5"
              }`}
            >
              <span
                data-motion-exempt
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  reducedMotion ? "translate-x-[22px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-[#111111] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Account</p>
          <p className="mt-2 text-sm text-white/45">
            {user ? `Signed in as ${user.email ?? "cloud account"}` : "Not signed in."}
          </p>
          <p className="mt-2 text-xs text-white/30">
            Motion presets and keyboard shortcuts sync to your account when signed in - useful on
            a shared device, since signing in always loads your own settings.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              to="/cloud"
              className="border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
            >
              {user ? "Manage Cloud Sessions" : "Sign In"}
            </Link>

            {user && (
              <button
                onClick={() => AuthService.signOut()}
                className="border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-[#111111] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Keyboard shortcuts</p>
          <p className="mt-2 text-sm text-white/45">
            Click any key to rebind it. Shortcuts are scoped per view, so the same key can do
            different things in Speaker List, Motions, and Roll Call.
          </p>

          <div className="mt-5">
            <ShortcutRemapList />
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-[#111111] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Motion presets</p>
          <p className="mt-2 text-sm text-white/45">
            Add, edit, or remove the motions recognized on the Motions page - including the
            built-in ones.
          </p>

          <div className="mt-5">
            <MotionPresetManager />
          </div>
        </div>

      </div>
    </div>
  );
}
