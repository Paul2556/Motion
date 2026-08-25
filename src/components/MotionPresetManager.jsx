import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { getMotions, addMotion, updateMotion, deleteMotion, resetMotions, moveMotion, canonicalLabel } from "../motionPresets";

const DURATION_OPTIONS = [
  { value: "", label: "Dynamic" },
  { value: "total", label: "Total time only" },
  { value: "speaking", label: "Speaking time only" },
];

function emptyForm() {
  return { text: "", aliasInput: "", topic: false, durationField: "" };
}

function formFromMotion(motion) {
  return {
    text: motion.text,
    aliasInput: (motion.alias ?? []).join(", "),
    topic: motion.topic === true,
    durationField: motion.durationField ?? "",
  };
}

// Full CRUD over the motion vocabulary MotionInput matches against (see
// motionPresets.js) - built-in and user-added motions are indistinguishable
// once persisted, so every row gets the same edit/delete controls. No local
// state mirrors the store; every mutation goes straight to localStorage and
// a `tick` bump forces a re-render, same approach as SettingsPage's
// ShortcutRemapList.
export default function MotionPresetManager() {
  const [, setTick] = useState(0);
  const [editingId, setEditingId] = useState(null); // motion.id, "new", or null
  const [form, setForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const motions = getMotions();
  const formOpen = editingId !== null;

  function startAdd() {
    setForm(emptyForm());
    setConfirmDeleteId(null);
    setEditingId("new");
  }

  function startEdit(motion) {
    setForm(formFromMotion(motion));
    setConfirmDeleteId(null);
    setEditingId(motion.id);
  }

  function cancelForm() {
    setEditingId(null);
  }

  // Patch never includes an `explicit` key - see motionPresets.js's
  // updateMotion, whose merge-patch semantics mean an edit here can never
  // clobber the one built-in motion that relies on it.
  function submitForm() {
    const text = form.text.trim();
    if (!text) return;
    const patch = {
      text,
      alias: form.aliasInput.split(",").map((a) => a.trim()).filter(Boolean),
      topic: form.topic,
      durationField: form.durationField || null,
    };

    if (editingId === "new") {
      addMotion(patch);
    } else {
      updateMotion(editingId, patch);
    }
    setEditingId(null);
    setTick((t) => t + 1);
  }

  function handleDelete(id) {
    deleteMotion(id);
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
    setTick((t) => t + 1);
  }

  function handleReset() {
    resetMotions();
    setConfirmReset(false);
    setEditingId(null);
    setTick((t) => t + 1);
  }

  function handleMove(id, direction) {
    moveMotion(id, direction);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--app-text-muted)]">
        Order matters. When multiple motions are on the floor, the motion log always shows the
        one nearest the top of this list first. Use the arrows to re-rank a motion.
      </p>

      <div className="space-y-2">
        {motions.map((motion, index) => (
          <div key={motion.id} className="flex items-center justify-between gap-4 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2">
            <div className="flex shrink-0 flex-col">
              <button
                onClick={() => handleMove(motion.id, -1)}
                disabled={index === 0}
                aria-label={`Move ${motion.text} up`}
                className="text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)] disabled:opacity-20 disabled:hover:text-[var(--app-text-muted)]"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => handleMove(motion.id, 1)}
                disabled={index === motions.length - 1}
                aria-label={`Move ${motion.text} down`}
                className="text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)] disabled:opacity-20 disabled:hover:text-[var(--app-text-muted)]"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--app-text-secondary)]">{canonicalLabel(motion)}</p>
              {motion.alias?.length > 0 && (
                <p className="truncate text-xs text-[var(--app-text-muted)]">{[motion.text, ...motion.alias].join(" · ")}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {confirmDeleteId === motion.id ? (
                <>
                  <button
                    onClick={() => handleDelete(motion.id)}
                    className="text-xs uppercase tracking-[0.14em] text-[var(--danger)] hover:opacity-80"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs uppercase tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(motion)}
                    aria-label={`Edit ${motion.text}`}
                    className="text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(motion.id)}
                    aria-label={`Delete ${motion.text}`}
                    className="text-[var(--app-text-muted)] transition hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {formOpen && (
        <div className="space-y-3 border border-[var(--app-border)] bg-[var(--app-chip)] p-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Name</label>
            <input
              type="text"
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="e.g. Open a Moderated Caucus"
              className="mt-1 w-full border border-[var(--app-border)] bg-[var(--app-input)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-border-focus)]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Aliases (comma-separated)</label>
            <input
              type="text"
              value={form.aliasInput}
              onChange={(e) => setForm((f) => ({ ...f, aliasInput: e.target.value }))}
              placeholder="e.g. Moderated Caucus, Mod Caucus, Mod"
              className="mt-1 w-full border border-[var(--app-border)] bg-[var(--app-input)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-border-focus)]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Duration</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, durationField: opt.value }))}
                  className={`border px-2 py-2 text-xs transition ${
                    form.durationField === opt.value
                      ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)] text-[var(--app-text)]"
                      : "border-[var(--app-border)] bg-transparent text-[var(--app-text-muted)] hover:border-[var(--app-border-hover)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--app-text-secondary)]">
            <input
              type="checkbox"
              checked={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.checked }))}
              className="h-4 w-4 border-[var(--app-border)] bg-[var(--app-input)] accent-white"
            />
            Requires a topic
          </label>

          <div className="flex gap-2 pt-1">
            <button
              onClick={submitForm}
              className="border border-[var(--app-border)] bg-[var(--app-chip-active)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--app-text)] transition hover:bg-[var(--app-chip-active-hover)]"
            >
              Save
            </button>
            <button
              onClick={cancelForm}
              className="border border-[var(--app-border)] bg-transparent px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--app-text-muted)] transition hover:bg-[var(--app-chip)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={startAdd}
          className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
        >
          <Plus size={14} /> Add motion
        </button>

        {confirmReset ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--app-text-muted)]">Reset all motions to defaults?</span>
            <button onClick={handleReset} className="uppercase tracking-[0.14em] text-[var(--danger)] hover:opacity-80">
              Confirm
            </button>
            <button onClick={() => setConfirmReset(false)} className="uppercase tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)]"
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
        )}
      </div>
    </div>
  );
}
