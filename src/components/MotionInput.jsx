import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { getMotions } from "../motionPresets";
import { formatDuration } from "../utils/duration";
import { buildMotionPhrases, buildPhraseIndex, findHighlightRanges, shouldAutoExpand } from "../utils/motionParser";

const CATEGORY_COLOR = {
  motion: "var(--accent)",
  delegation: "var(--accent-alt)",
  "speaking-time": "var(--accent-time)",
  "total-time": "var(--accent-duration)",
  topic: "var(--accent-topic)",
};

function buildSegments(text, ranges) {
  const segments = [];
  let cursor = 0;
  for (const { start, end, category, fuzzy } of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), color: null });
    segments.push({ text: text.slice(start, end), color: CATEGORY_COLOR[category], fuzzy });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), color: null });
  return segments;
}

// Highlights motions, delegations, and durations as the chair types, dashed
// underline for a typo-tolerant match. A plain textarea can't render colored
// spans, so a read-only highlighted backdrop sits behind a transparent
// textarea, preserving the real caret and selection.
const MotionInput = forwardRef(function MotionInput({ value, onChange, placeholder, rows = 8, className = "", fuzzyLevel = 0.3, delegations, onSubmit }, ref) {
  const textareaRef = useRef(null);
  const backdropRef = useRef(null);
  const [invalid, setInvalid] = useState(false);

  // Lets the dais keyboard shortcuts (Motions view's "M") focus the box from
  // outside without exposing anything else about its internals.
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  const motionPhrases = useMemo(() => buildMotionPhrases(getMotions()), []);
  const phraseIndex = useMemo(() => buildPhraseIndex(delegations, motionPhrases), [delegations, motionPhrases]);
  const { ranges, meta } = useMemo(
    () => findHighlightRanges(value, fuzzyLevel, phraseIndex),
    [value, fuzzyLevel, phraseIndex]
  );

  function syncScroll() {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  // Plain Enter submits and clears; Shift+Enter inserts a newline. A
  // per-speaker time longer than the total is never valid, so it's rejected
  // with a flash and the offending span cut out for retyping.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (!onSubmit || !value.trim()) return;
      event.preventDefault();

      if (meta.totalTime != null && meta.speakingTime != null && meta.speakingTime > meta.totalTime) {
        setInvalid(true);
        const el = event.target;
        const speakingRange = ranges.find((r) => r.category === "speaking-time");
        setTimeout(() => {
          setInvalid(false);
          if (speakingRange) {
            onChange(value.slice(0, speakingRange.start) + value.slice(speakingRange.end));
            requestAnimationFrame(() => el.setSelectionRange(speakingRange.start, speakingRange.start));
          }
        }, 300);
        return;
      }

      onSubmit(meta);
      onChange("");
      return;
    }

    if (event.key !== " ") return;
    const el = event.target;
    if (el.selectionStart !== el.selectionEnd) return;
    const cursorPos = el.selectionStart;

    const match = ranges.find((r) => r.end === cursorPos && r.category === "delegation");
    if (!match) return;

    const matchedText = value.slice(match.start, match.end);
    if (!shouldAutoExpand(matchedText, match.canonical)) return;

    event.preventDefault();
    const newValue = `${value.slice(0, match.start)}${match.canonical} ${value.slice(match.end)}`;
    onChange(newValue);

    const newPos = match.start + match.canonical.length + 1;
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
  }

  const segments = buildSegments(value, ranges);

  return (
    <div className={className}>
      <div
        className={`relative border border-[var(--app-border)] bg-[var(--app-chip)] transition focus-within:border-[var(--app-border-focus)] ${invalid ? "motion-input-shake" : ""}`}
      >
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4 text-sm text-[var(--app-text)]"
        >
          {segments.map((segment, i) => (
            <span
              key={i}
              style={
                invalid
                  ? { color: "#f87171" }
                  : segment.color
                    ? { color: segment.color, textDecoration: segment.fuzzy ? "underline dashed" : undefined }
                    : undefined
              }
            >
              {segment.text}
            </span>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          placeholder={placeholder}
          rows={rows}
          className="relative w-full resize-none bg-transparent p-4 text-sm text-transparent caret-[var(--app-text)] outline-none placeholder:text-[var(--app-text-faint)]"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetaStat label="Motion" value={meta.motion} />
        <MetaStat label="Country" value={meta.delegation} />
        <MetaStat label="Topic" value={meta.topic} />
        <MetaStat label="Speaking Time" value={formatDuration(meta.speakingTime)} />
        <MetaStat label="Total Time" value={formatDuration(meta.totalTime)} />
      </div>
    </div>
  );
});

export default MotionInput;

function MetaStat({ label, value }) {
  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm text-[var(--app-text)]">{value ?? "-"}</p>
    </div>
  );
}
