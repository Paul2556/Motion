import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Timer from "./Timer";
import Queue from "./Queue";
import Flag from "./Flag";
import AppTopBar from "./AppTopBar";
import ShortcutLegend from "./ShortcutLegend";
import ConferenceService from "../services/ConferenceService";
import { ROTATION_SEQUENCES, positionAt } from "../utils/rotation";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

// The real session dais - speech/timer/queue - shared by the actual /session
// route (SessionPage.jsx, inside .app-shell) and the landing page's live hero
// preview (LandingPage.jsx, outside .app-shell, so it supplies
// --timer-remaining itself). `linked` turns the header's Roll Call/Motion
// buttons into real navigation only on the real route - the landing preview
// shouldn't route a visitor away from the marketing page.
export default function SessionBoard({
  committeeLabel,
  initialSpeaker = null,
  initialQueue = [],
  speechLength = 72,
  activeMotion,
  suggestions = [],
  linked = true,
}) {
  const [currentSpeaker, setCurrentSpeaker] = useState(initialSpeaker);
  const [queue, setQueue] = useState(initialQueue);
  const [history, setHistory] = useState([]);
  const [selectedQueueIndex, setSelectedQueueIndex] = useState(-1);
  const [legendOpen, setLegendOpen] = useState(false);
  // Resolution-debate speaker rotation (Against/For, or Against/To/For) -
  // stored per-committee on ConferenceService (see its "resolution debate
  // speaker rotation" section), mirrored here the same way queue/speaker
  // state already is elsewhere in this file.
  const [rotation, setRotationState] = useState(() => ConferenceService.getRotation());

  const navigate = useNavigate();
  const timerRef = useRef(null);
  const queueRef = useRef(null);
  // Single-slot "undo the last thing" - not a history stack. Overwritten by
  // the next undoable action, same as a clipboard. A ref (not state) since
  // it doesn't need to trigger a render on its own, only the undo/redo it
  // drives does.
  const undoRef = useRef(null);

  const clampedQueueIndex = queue.length === 0 ? -1 : Math.min(selectedQueueIndex, queue.length - 1);

  const nextSpeaker = (elapsedSeconds = 0) => {
    if (queue.length === 0) return;

    if (currentSpeaker) {
      ConferenceService.markSpoken(currentSpeaker.id, Math.round(elapsedSeconds));
      setHistory((prev) => [...prev, currentSpeaker]);
    }

    setCurrentSpeaker(queue[0]);
    setQueue((prev) => prev.slice(1));
  };

  // Snapshots pre-advance state for undo, then drives the advance through
  // Timer's own nextSpeaker (via triggerNext) rather than calling the
  // SessionBoard nextSpeaker above directly - that's the only path that
  // computes real elapsed speaking time, same as the mouse "Next" button.
  function recognizeNext() {
    if (queue.length === 0) return;
    undoRef.current = {
      type: "advance",
      previousSpeaker: currentSpeaker,
      previousQueue: queue,
      hadPreviousSpeaker: Boolean(currentSpeaker),
    };
    timerRef.current?.triggerNext();
  }

  // Manual, independent of recognizeNext - the queue is shared by every
  // speech type (caucuses included), not just resolution debate, so
  // advancing it automatically on every recognized speaker would be wrong
  // outside that specific phase. Chair operates this widget only when it's
  // actually relevant, same "chair discretion" framing as the RoP itself.
  function chooseRotationType(type) {
    ConferenceService.setRotationType(type);
    setRotationState(ConferenceService.getRotation());
  }

  function advanceRotation() {
    ConferenceService.advanceRotation();
    setRotationState(ConferenceService.getRotation());
  }

  function resetRotation() {
    ConferenceService.resetRotation();
    setRotationState(ConferenceService.getRotation());
  }

  function removeSelected() {
    if (clampedQueueIndex < 0) return;
    const removed = queue[clampedQueueIndex];
    undoRef.current = { type: "remove", speaker: removed, index: clampedQueueIndex };
    setQueue((prev) => prev.filter((_, i) => i !== clampedQueueIndex));
  }

  function performUndo() {
    const action = undoRef.current;
    if (!action) return;
    undoRef.current = null;

    if (action.type === "remove") {
      setQueue((prev) => {
        const next = [...prev];
        next.splice(Math.min(action.index, next.length), 0, action.speaker);
        return next;
      });
    } else if (action.type === "advance") {
      setCurrentSpeaker(action.previousSpeaker);
      setQueue(action.previousQueue);
      if (action.hadPreviousSpeaker) {
        setHistory((prev) => prev.slice(0, -1));
      }
    }
  }

  useDaisShortcuts(
    "speakerList",
    {
      "speakerList.recognizeNext": recognizeNext,
      "speakerList.toggleTimer": () => timerRef.current?.toggleRunning(),
      "speakerList.resetTimer": () => timerRef.current?.reset(),
      "speakerList.removeSelected": removeSelected,
      "speakerList.addSpeaker": () => queueRef.current?.focusAddInput(),
      "speakerList.moveUp": () => setSelectedQueueIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1)),
      "speakerList.moveDown": () =>
        setSelectedQueueIndex((i) => Math.min(queue.length - 1, (i < 0 ? -1 : i) + 1)),
      "global.undo": performUndo,
      "global.legend": () => setLegendOpen((open) => !open),
      "global.viewRollCall": () => navigate("/rollcall"),
      "global.viewMotions": () => navigate("/motion"),
      "global.viewGeneralVoting": () => navigate("/vote"),
    },
    { active: linked }
  );

  const estimatedMinutes = Math.ceil(
    ((queue.length + (currentSpeaker ? 1 : 0)) * speechLength) / 60
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppTopBar
        committeeLabel={committeeLabel}
        linked={linked}
        onShowShortcuts={() => setLegendOpen(true)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto rounded-none border border-[var(--app-border)] bg-[var(--app-panel)] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--app-text-muted)]">Active speech</p>
              <h1 className="mt-3 flex items-center gap-3 text-2xl sm:text-xl sm:text-4xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                <Flag countryCode={currentSpeaker?.countryCode} className="text-xl sm:text-2xl" />
                {currentSpeaker?.country ?? "No speaker selected"}
              </h1>
            </div>
            <span className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--app-text-secondary)]">{activeMotion}</span>
          </div>

          {linked && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3">
              <div className="flex items-center gap-1">
                {Object.keys(ROTATION_SEQUENCES).map((type) => (
                  <button
                    key={type}
                    onClick={() => chooseRotationType(type)}
                    className={`border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
                      rotation.type === type
                        ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)] text-[var(--app-text)]"
                        : "border-[var(--app-border)] bg-transparent text-[var(--app-text-muted)] hover:border-[var(--app-border-hover)]"
                    }`}
                  >
                    {ROTATION_SEQUENCES[type].join(" → ")}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
                  Next: <span className="text-[var(--app-text)]">{positionAt(rotation.type, rotation.index)}</span>
                </span>
                <button
                  onClick={advanceRotation}
                  className="border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
                >
                  Advance
                </button>
                <button
                  onClick={resetRotation}
                  className="border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--app-text-muted)] transition hover:text-[var(--app-text-secondary)]"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center gap-12">
            <Timer
              ref={timerRef}
              initialTime={speechLength}
              onNext={nextSpeaker}
            />
          </div>

          <div className="mt-auto grid grid-cols-3 gap-5 sm:gap-4">
            <div className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-6 py-4 xl:py-5 text-center">
              <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                {estimatedMinutes} min
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[var(--app-text-muted)]">Estimated</p>
            </div>
            <div className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-6 py-4 xl:py-5 text-center">
              <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                {history.length}
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[var(--app-text-muted)]">Spoken</p>
            </div>
            <div className="rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-6 py-4 xl:py-5 text-center">
              <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                {queue.length}
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[var(--app-text-muted)]">Queued</p>
            </div>
          </div>
        </div>

        <Queue
          ref={queueRef}
          queue={queue}
          setQueue={setQueue}
          suggestions={suggestions}
          selectedIndex={clampedQueueIndex}
          onSelectIndex={setSelectedQueueIndex}
        />
      </div>

      {linked && (
        <ShortcutLegend scopeName="speakerList" open={legendOpen} onClose={() => setLegendOpen(false)} />
      )}
    </div>
  );
}
