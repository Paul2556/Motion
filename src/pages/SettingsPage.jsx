import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Coffee, ListChecks, Moon, RotateCcw, Search, Sun, Type, X } from "lucide-react";

import Logo from "../components/Logo";
import MotionPresetManager from "../components/MotionPresetManager";
import { getAppTheme, setAppTheme, getAppReducedMotion, setAppReducedMotion } from "../appTheme";
import { getMotionInputMode, setMotionInputMode } from "../motionInputMode";
import { getMotions, canonicalLabel } from "../motionPresets";
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

// query is already trimmed/lowercased by the caller - an empty query always
// matches, so every section shows by default.
function matches(query, ...terms) {
  if (!query) return true;
  return terms.some((term) => term && term.toLowerCase().includes(query));
}

function ShortcutRemapList({ query }) {
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

  const visibleScopes = REMAPPABLE_SCOPES
    .map((scope) => ({
      scope,
      actions: SHORTCUT_SCOPES[scope].filter((action) => matches(query, action.label)),
    }))
    .filter(({ actions }) => actions.length > 0);

  if (query && visibleScopes.length === 0) {
    return <p className="text-sm text-[var(--app-text-faint)]">No shortcuts match &quot;{query}&quot;.</p>;
  }

  return (
    <div className="space-y-5">
      {visibleScopes.map(({ scope, actions }) => (
        <div key={scope}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--app-text-muted)]">{SCOPE_TITLES[scope]}</p>
          <div className="mt-2 space-y-1.5">
            {actions.map((action) => {
              const isCapturing = capturingId === action.id;
              const hasOverride = Boolean(getShortcutOverride(action.id));

              return (
                <div key={action.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--app-text-secondary)]">{action.label}</span>
                  <div className="flex items-center gap-2">
                    {hasOverride && (
                      <button
                        onClick={() => {
                          clearShortcutOverride(action.id);
                          setTick((t) => t + 1);
                        }}
                        aria-label={`Reset ${action.label} to default`}
                        className="text-[var(--app-text-faint)] transition hover:text-[var(--app-text-secondary)]"
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
                          ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)] text-[var(--app-text)]"
                          : "border-[var(--app-border)] bg-[var(--app-chip)] text-[var(--app-text-secondary)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
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
        <p className="text-xs text-[var(--app-text-faint)]">
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
          ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)]"
          : "border-[var(--app-border)] bg-[var(--app-chip)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center border border-[var(--app-border)] bg-[var(--app-input)]">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {active && (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
          <Check size={12} /> Active
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [theme, setTheme] = useState(getAppTheme);
  const [reducedMotion, setReducedMotion] = useState(getAppReducedMotion);
  const [motionInputMode, setMotionInputModeState] = useState(getMotionInputMode);
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [query, setQuery] = useState("");

  useEffect(() => AuthService.subscribe(setUser), []);

  function chooseTheme(next) {
    setTheme(next);
    setAppTheme(next);
  }

  function chooseMotionInputMode(next) {
    setMotionInputModeState(next);
    setMotionInputMode(next);
  }

  function toggleReducedMotion() {
    const next = !reducedMotion;
    setReducedMotion(next);
    setAppReducedMotion(next);
  }

  const q = query.trim().toLowerCase();

  const showTheme = matches(q, "Theme", "appearance", "dark", "light", "black", "white", "brown", "color scheme");
  const showReducedMotion = matches(q, "Reduced motion", "animation", "transitions", "accessibility");
  const showAccount = matches(
    q,
    "Account",
    "sign in",
    "sign out",
    "cloud",
    "login",
    "email",
    user ? `Signed in as ${user.email ?? "cloud account"}` : "Not signed in"
  );
  const anyShortcutMatches = REMAPPABLE_SCOPES.some((scope) =>
    SHORTCUT_SCOPES[scope].some((action) => matches(q, action.label))
  );
  const showShortcuts = matches(q, "Keyboard shortcuts", "keybind", "hotkeys") || anyShortcutMatches;
  const showMotionInput = matches(q, "Motion input", "natural language", "dropdown", "form");
  const anyMotionMatches = getMotions().some((motion) => matches(q, canonicalLabel(motion), motion.text, ...(motion.alias ?? [])));
  const showMotionPresets = matches(q, "Motion presets", "presets", "custom motion", "built-in") || anyMotionMatches;

  const noResults = Boolean(q) && !showTheme && !showReducedMotion && !showAccount && !showShortcuts && !showMotionInput && !showMotionPresets;

  return (
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <Logo compact light />
            </Link>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--app-text-muted)]">Settings</span>
          </div>

          <Link
            to="/home"
            className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

        <div className="relative mb-6">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings…"
            className="w-full border border-[var(--app-border)] bg-[var(--app-chip)] py-3 pl-11 pr-11 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)] transition hover:text-[var(--app-text-secondary)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {noResults && (
          <p className="border border-dashed border-[var(--app-border)] py-10 text-center text-sm text-[var(--app-text-faint)]">
            No settings match &quot;{query}&quot;.
          </p>
        )}

        {showTheme && (
        <div className="border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Theme</p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">Choose how Motion looks across the app.</p>

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
            <ThemeOption
              label="Brown"
              icon={<Coffee size={18} />}
              active={theme === "brown"}
              onClick={() => chooseTheme("brown")}
            />
          </div>
        </div>
        )}

        {showReducedMotion && (
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Reduced motion</p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">Turn off transitions and animations across the app.</p>
            </div>

            <button
              onClick={toggleReducedMotion}
              role="switch"
              aria-checked={reducedMotion}
              aria-label="Reduced motion"
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                reducedMotion ? "border-[var(--app-border-active)] bg-[var(--app-toggle-on)]" : "border-[var(--app-border)] bg-[var(--app-chip)]"
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
        )}

        {showAccount && (
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Account</p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
            {user ? `Signed in as ${user.email ?? "cloud account"}` : "Not signed in."}
          </p>
          <p className="mt-2 text-xs text-[var(--app-text-faint)]">
            Motion presets and keyboard shortcuts sync to your account when signed in - useful on
            a shared device, since signing in always loads your own settings.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              to="/cloud"
              className="border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
            >
              {user ? "Manage Cloud Sessions" : "Sign In"}
            </Link>

            {user && (
              <button
                onClick={() => AuthService.signOut()}
                className="border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
        )}

        {showShortcuts && (
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Keyboard shortcuts</p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
            Click any key to rebind it. Shortcuts are scoped per view, so the same key can do
            different things in Speaker List, Motions, and Roll Call.
          </p>

          <div className="mt-5">
            <ShortcutRemapList query={q} />
          </div>
        </div>
        )}

        {showMotionInput && (
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Motion input</p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">Choose how you add new motions on the Motions page.</p>

          <div className="mt-5 flex gap-4">
            <ThemeOption
              label="Natural language"
              icon={<Type size={18} />}
              active={motionInputMode === "natural"}
              onClick={() => chooseMotionInputMode("natural")}
            />
            <ThemeOption
              label="Dropdown form"
              icon={<ListChecks size={18} />}
              active={motionInputMode === "dropdown"}
              onClick={() => chooseMotionInputMode("dropdown")}
            />
          </div>
        </div>
        )}

        {showMotionPresets && (
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-text-muted)]">Motion presets</p>
          <p className="mt-2 text-sm text-[var(--app-text-muted)]">
            Add, edit, or remove the motions recognized on the Motions page - including the
            built-in ones.
          </p>

          <div className="mt-5">
            <MotionPresetManager query={q} />
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
