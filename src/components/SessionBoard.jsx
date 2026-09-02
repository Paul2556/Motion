import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Timer from "./Timer";
import Queue from "./Queue";
import Flag from "./Flag";
import AppTopBar from "./AppTopBar";
import ShortcutLegend from "./ShortcutLegend";
import ConferenceService from "../services/ConferenceService";
import LiveSessionService from "../services/LiveSessionService";
import { useDaisShortcuts } from "../hooks/useDaisShortcuts";

// Shared by the real /session route and the landing page's hero preview,
// which sits outside .app-shell. `linked` enables real navigation only on the
// route, so the preview can't route a visitor off the marketing page.
export default function SessionBoard({
  committeeLabel,
  initialSpeaker = null,
  initialQueue = [],
  speechLength = 72,
  activeMotion,
  suggestions = [],
  linked = true,
}) {
  // Landing on a fresh queue (seeded roster or a passed motion's mover, see
  // SessionPage) with no one recognized yet shouldn't sit idle on "No
  // speaker selected" - the very first speaker is pulled up front and the
  // rest of the queue starts one shorter, computed once in these lazy
  // initializers (each runs exactly once, at mount, off the true initial
  // props) rather than via an effect correcting the state after the fact.
  const [currentSpeaker, setCurrentSpeaker] = useState(() => initialSpeaker ?? initialQueue[0] ?? null);
  const [queue, setQueue] = useState(() =>
    initialSpeaker || initialQueue.length === 0 ? initialQueue : initialQueue.slice(1)
  );
  // Whether that auto-advance happened - also computed once at mount and
  // never changed afterward, so the timer-start effect below has a stable
  // dependency and genuinely only ever runs once, same intent as the state
  // above without needing to inspect currentSpeaker/queue after the fact.
  const [shouldAutoStartTimer] = useState(() => !initialSpeaker && initialQueue.length > 0);
  const [history, setHistory] = useState([]);
  const [selectedQueueIndex, setSelectedQueueIndex] = useState(-1);
  const [legendOpen, setLegendOpen] = useState(false);

  const navigate = useNavigate();
  const timerRef = useRef(null);
  const queueRef = useRef(null);
  // Single-slot "undo the last thing" - not a history stack. Overwritten by
  // the next undoable action, same as a clipboard. A ref (not state) since
  // it doesn't need to trigger a render on its own, only the undo/redo it
  // drives does.
  const undoRef = useRef(null);

  const clampedQueueIndex = queue.length === 0 ? -1 : Math.min(selectedQueueIndex, queue.length - 1);

  // Only set once the chair hits "Go Live" on /cloud - a purely local
  // session never reads this and never touches Firestore.
  const liveSessionId = LiveSessionService.getActiveSessionId();

  useEffect(() => {
    if (!liveSessionId) return;
    LiveSessionService.publish(liveSessionId, { currentSpeaker, queue });
  }, [liveSessionId, currentSpeaker, queue]);

  // The other half of the auto-advance above: Timer only attaches its ref
  // after mount, so starting it can't happen in the lazy initializers
  // themselves. shouldAutoStartTimer never changes after mount, so this
  // effect - which calls no local setState, only an imperative ref method -
  // genuinely only ever runs once.
  useEffect(() => {
    if (shouldAutoStartTimer) timerRef.current?.start();
  }, [shouldAutoStartTimer]);

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

          <div className="flex flex-1 flex-col items-center justify-center gap-12">
            <Timer
              ref={timerRef}
              initialTime={speechLength}
              onNext={nextSpeaker}
              onAnchorChange={(anchor) => liveSessionId && LiveSessionService.publishTimerAnchor(liveSessionId, anchor)}
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
