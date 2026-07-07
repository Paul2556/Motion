import { useState } from "react";
import Timer from "../components/Timer";
import Queue from "../components/Queue";
import ConferenceService from "../services/ConferenceService";

import Logo from "../components/Logo";

export default function AppSnapshotPage() {

  const committee = ConferenceService.getActiveCommittee();

  // Seeded once from whatever ConferenceService already has loaded (set by
  // HomePage's upload -> committee picker flow before navigating here). No
  // speaker is "current" until the chair actually advances the queue.
  const [currentSpeaker, setCurrentSpeaker] = useState(null);

  const [queue, setQueue] = useState(() =>
    (committee?.delegates ?? []).map((delegate) => ({
      id: delegate.id,
      country: delegate.countryDisplay || delegate.country,
    }))
  );

  const [history, setHistory] = useState([]);

  const nextSpeaker = () => {
    if (queue.length === 0) return;

    if (currentSpeaker) {
      setHistory((prev) => [...prev, currentSpeaker]);
    }

    setCurrentSpeaker(queue[0]);

    setQueue((prev) => prev.slice(1));
  };

  const speechLength = 72;

  const activeMotion = "Moderated Caucus — 72s / speaker";

  const estimatedMinutes = Math.ceil(
    ((queue.length + (currentSpeaker ? 1 : 0)) * speechLength) / 60
  );
  return (
    <div className="app-shell h-screen overflow-hidden bg-[#0d0d0d] text-white">
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <header className="mb-6 flex flex-col gap-4 rounded-none border border-white/10 bg-[#0f0f0f] p-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <Logo compact light />
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">{committee?.committee ?? committee?.id ?? "No committee loaded"}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-none border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Motion: {activeMotion}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto rounded-none border border-white/10 bg-[#121212] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Active speech</p>
                <h1 className="mt-3 text-2xl sm:text-xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
                  {currentSpeaker?.country ?? "No speaker selected"}
                </h1>
              </div>
              <span className="rounded-none border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/60">Moderated caucus</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-12">
              <Timer
                initialTime={speechLength}
                onNext={nextSpeaker}
              />
            </div>
            
            <div className="mt-auto grid grid-cols-3 gap-5 sm:gap-4">
              <div className="rounded-none border border-white/10 bg-white/5 px-6 py-8 xl:py-10 text-center">
                <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                  {estimatedMinutes} min
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/40">Estimated</p>
              </div>
              <div className="rounded-none border border-white/10 bg-white/5 px-6 py-8 xl:py-10 text-center">
                <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                  {history.length}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/40">Spoken</p>
              </div>
              <div className="rounded-none border border-white/10 bg-white/5 px-6 py-8 xl:py-10 text-center">
                <p className="text-2xl sm:text-xl sm:text-4xl font-semibold">
                  {queue.length}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/40">Queued</p>
              </div>
            </div>
          </div>

          <Queue
            queue={queue}
            setQueue={setQueue}
          />
        </div>
      </div>
    </div>
  )
}
