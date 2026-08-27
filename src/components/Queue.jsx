import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import Flag from "./Flag";

const MAX_SUGGESTIONS = 6;

const Queue = forwardRef(function Queue({
  queue,
  setQueue,
  suggestions = [],
  selectedIndex = -1,
  onSelectIndex,
}, ref) {
  const [newSpeaker, setNewSpeaker] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);

  // Lets the dais keyboard shortcuts (Speaker List's "A") focus the add
  // box from outside, without exposing anything else about this component.
  useImperativeHandle(ref, () => ({
    focusAddInput: () => inputRef.current?.focus(),
  }));

  const filtered = useMemo(() => {
    const query = newSpeaker.trim().toLowerCase();
    if (!query || suggestions.length === 0) return [];
    return suggestions
      .filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.alias?.some((a) => a.toLowerCase().includes(query))
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [newSpeaker, suggestions]);

  function addSpeaker({ name, code = null }) {
    const trimmed = name.trim();

    if (!trimmed) return;

    setQueue([
      ...queue,
      {
        id: crypto.randomUUID(),
        country: trimmed,
        countryCode: code,
      },
    ]);

    setNewSpeaker("");
    setActiveIndex(-1);
  }

  // Enter adds the highlighted suggestion, else the first match. Suggestions
  // are scoped to this committee, so an empty `filtered` means the text isn't
  // a real delegation and Enter no-ops rather than adding a fake speaker.
  function submitTyped() {
    if (activeIndex >= 0 && filtered[activeIndex]) {
      addSpeaker(filtered[activeIndex]);
      return;
    }

    if (filtered[0]) {
      addSpeaker(filtered[0]);
    }
  }

  function removeSpeaker(id) {
    setQueue(queue.filter((speaker) => speaker.id !== id));
  }

  function moveUp(index) {
    if (index === 0) return;

    const copy = [...queue];

    [copy[index], copy[index - 1]] = [
      copy[index - 1],
      copy[index],
    ];

    setQueue(copy);
  }

  function moveDown(index) {
    if (index === queue.length - 1) return;

    const copy = [...queue];

    [copy[index], copy[index + 1]] = [
      copy[index + 1],
      copy[index],
    ];

    setQueue(copy);
  }

  // One-click jump to either end - e.g. a moderated caucus's raiser asking
  // to speak first or last (RoP 21(b)(ii)) - rather than repeated
  // moveUp/moveDown clicks through a long queue.
  function moveToTop(index) {
    if (index === 0) return;

    const copy = [...queue];
    const [item] = copy.splice(index, 1);
    copy.unshift(item);

    setQueue(copy);
  }

  function moveToBottom(index) {
    if (index === queue.length - 1) return;

    const copy = [...queue];
    const [item] = copy.splice(index, 1);
    copy.push(item);

    setQueue(copy);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-panel)] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.25)]">

      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">
          Up Next
        </p>
      </div>

      <div className="relative mt-6 flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={newSpeaker}
            onChange={(e) => {
              setNewSpeaker(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (filtered.length) setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (filtered.length) setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                submitTyped();
              } else if (e.key === "Escape") {
                setInputFocused(false);
              }
            }}
            placeholder="Country..."
            className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
          />

          {inputFocused && filtered.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto border border-[var(--app-border)] bg-[var(--app-input)] shadow-[0_12px_30px_rgba(0,0,0,.35)]">
              {filtered.map((s, index) => (
                <button
                  key={s.code ?? s.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addSpeaker(s)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                    index === activeIndex ? "bg-[var(--app-chip-active)] text-[var(--app-text)]" : "text-[var(--app-text-secondary)] hover:bg-[var(--app-chip)]"
                  }`}
                >
                  <Flag countryCode={s.code} />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={submitTyped}
          className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-4 transition hover:bg-[var(--app-chip-active)]"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">

        {queue.length === 0 && (
          <div className="border border-dashed border-[var(--app-border)] py-10 text-center text-sm text-[var(--app-text-faint)]">
            No speakers queued.
          </div>
        )}

        {queue.map((speaker, index) => (
          <div
            key={speaker.id}
            onClick={() => onSelectIndex?.(index)}
            className={`group border px-5 py-4 transition hover:bg-[var(--app-chip-active)] ${
              index === selectedIndex ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)]" : "border-[var(--app-border)] bg-[var(--app-chip)]"
            }`}
          >
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--app-text-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="inline-flex items-center gap-2 text-[var(--app-text)]">
                  <Flag countryCode={speaker.countryCode} />
                  {speaker.country}
                </span>
              </div>

              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">

                <button
                  onClick={() => moveToTop(index)}
                  aria-label="Move to top"
                  className="border border-[var(--app-border)] p-2 hover:bg-[var(--app-chip-active)]"
                >
                  <ChevronsUp size={14} />
                </button>

                <button
                  onClick={() => moveUp(index)}
                  aria-label="Move up"
                  className="border border-[var(--app-border)] p-2 hover:bg-[var(--app-chip-active)]"
                >
                  <ChevronUp size={14} />
                </button>

                <button
                  onClick={() => moveDown(index)}
                  aria-label="Move down"
                  className="border border-[var(--app-border)] p-2 hover:bg-[var(--app-chip-active)]"
                >
                  <ChevronDown size={14} />
                </button>

                <button
                  onClick={() => moveToBottom(index)}
                  aria-label="Move to bottom"
                  className="border border-[var(--app-border)] p-2 hover:bg-[var(--app-chip-active)]"
                >
                  <ChevronsDown size={14} />
                </button>

                <button
                  onClick={() => removeSpeaker(speaker.id)}
                  className="border border-[rgba(var(--danger-rgb),0.3)] p-2 text-[var(--danger)] outline-none transition hover:bg-[rgba(var(--danger-rgb),0.1)] focus-visible:border-[var(--danger)]"
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
});

export default Queue;
