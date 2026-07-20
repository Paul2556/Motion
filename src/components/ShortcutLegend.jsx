import { X } from "lucide-react";
import { SHORTCUT_SCOPES } from "../shortcuts";
import { resolveKey, keyIdToDisplay } from "../shortcutPrefs";

const SCOPE_TITLES = {
  global: "Global",
  speakerList: "Speaker List",
  motions: "Motions",
  rollCall: "Roll Call",
};

// Context-aware: only ever shows `global` (always relevant) plus whichever
// view-scope the current page passes in, never the full cross-app map - a
// Roll Call shortcut showing up while chairing Motions would just be noise,
// since it does nothing until the chair switches views.
export default function ShortcutLegend({ scopeName, open, onClose }) {
  if (!open) return null;

  const sections = [
    { title: SCOPE_TITLES.global, actions: SHORTCUT_SCOPES.global },
    { title: SCOPE_TITLES[scopeName], actions: SHORTCUT_SCOPES[scopeName] ?? [] },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="w-full max-w-md border border-white/10 bg-[#111111] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="border border-white/10 p-1.5 text-white/50 transition hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 max-h-[60vh] space-y-5 overflow-y-auto">
          {sections.map(({ title, actions }) => actions.length > 0 && (
            <div key={title}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">{title}</p>
              <div className="mt-2 space-y-1.5">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-white/70">{action.label}</span>
                    <span className="shrink-0 border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60">
                      {keyIdToDisplay(resolveKey(action.id))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-white/35">
          Remap any shortcut from Settings → Keyboard shortcuts.
        </p>
      </div>
    </div>
  );
}
