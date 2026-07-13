import { useState } from "react";
import { Link } from "react-router-dom";
import Timer from "./Timer";
import Queue from "./Queue";
import Flag from "./Flag";
import Logo from "./Logo";

function NavItem({ to, linked, className, children }) {
  return linked ? (
    <Link to={to} className={className}>{children}</Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

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

  const nextSpeaker = () => {
    if (queue.length === 0) return;

    if (currentSpeaker) {
      setHistory((prev) => [...prev, currentSpeaker]);
    }

    setCurrentSpeaker(queue[0]);
    setQueue((prev) => prev.slice(1));
  };

  const estimatedMinutes = Math.ceil(
    ((queue.length + (currentSpeaker ? 1 : 0)) * speechLength) / 60
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-6 flex flex-col gap-4 rounded-none border border-white/10 bg-[#0f0f0f] p-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <Logo compact light />
          <span className="text-xs uppercase tracking-[0.18em] text-white/50">{committeeLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <NavItem
            to="/rollcall"
            linked={linked}
            className="inline-flex items-center gap-2 rounded-none border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:border-white/20 hover:bg-white/10"
          >
            Roll Call
          </NavItem>
          <NavItem
            to="/motion"
            linked={linked}
            className="inline-flex items-center gap-2 rounded-none border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition hover:border-white/20 hover:bg-white/10"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Motion: {activeMotion}
          </NavItem>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto rounded-none border border-white/10 bg-[#121212] p-5 sm:p-6 lg:p-8 shadow-[0_25px_80px_rgba(0,0,0,.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Active speech</p>
              <h1 className="mt-3 flex items-center gap-3 text-2xl sm:text-xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
                <Flag countryCode={currentSpeaker?.countryCode} className="text-xl sm:text-2xl" />
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
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
