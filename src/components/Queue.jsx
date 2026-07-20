import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
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

  // Enter with a suggestion highlighted (arrow keys) adds that one; otherwise
  // it adds the first autosuggestion match. `suggestions` is already scoped
  // to this committee's own delegates (see SessionPage.jsx), so an empty
  // `filtered` means the typed text isn't an actual delegation here - Enter
  // is a no-op rather than adding arbitrary typed text as a fake speaker.
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

  return (
    <div className="flex h-full min-h-0 flex-col rounded-none border border-white/10 bg-[#121212] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.25)]">

      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">
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
            className="w-full rounded-none border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          />

          {inputFocused && filtered.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto border border-white/10 bg-[#181818] shadow-[0_12px_30px_rgba(0,0,0,.35)]">
              {filtered.map((s, index) => (
                <button
                  key={s.code ?? s.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addSpeaker(s)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                    index === activeIndex ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
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
          className="rounded-none border border-white/10 bg-white/5 px-4 transition hover:bg-white/10"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">

        {queue.length === 0 && (
          <div className="border border-dashed border-white/10 py-10 text-center text-sm text-white/30">
            No speakers queued.
          </div>
        )}

        {queue.map((speaker, index) => (
          <div
            key={speaker.id}
            onClick={() => onSelectIndex?.(index)}
            className={`group border px-5 py-4 transition hover:bg-white/10 ${
              index === selectedIndex ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-white/40">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="inline-flex items-center gap-2 text-white">
                  <Flag countryCode={speaker.countryCode} />
                  {speaker.country}
                </span>
              </div>

              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">

                <button
                  onClick={() => moveUp(index)}
                  className="border border-white/10 p-2 hover:bg-white/10"
                >
                  <ChevronUp size={14} />
                </button>

                <button
                  onClick={() => moveDown(index)}
                  className="border border-white/10 p-2 hover:bg-white/10"
                >
                  <ChevronDown size={14} />
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
