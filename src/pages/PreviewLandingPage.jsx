import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Import,
  Menu,
  Play,
  Vote,
  X,
} from "lucide-react";

import Logo from "../components/Logo";
import Flag from "../components/Flag";
import Timer from "../components/Timer";
import Queue from "../components/Queue";
import SeatChart from "../components/SeatChart";
import MotionInput from "../components/MotionInput";
import DelegateRoster from "../components/DelegateRoster";
import { countries } from "../constants";

// Same real steps LandingPage's "#how" section tells, just restyled here with
// a heavier scroll-reveal - content stays identical on purpose (one story,
// two treatments), not a rewrite.
const STEPS = [
  { icon: Import, title: "Import committee", body: "Upload the delegate roster and review voting status." },
  { icon: Play, title: "Run debate", body: "Control speakers, motions, and time from one view." },
  { icon: Vote, title: "Manage votes", body: "Record decisions with the correct majority, instantly." },
  { icon: BarChart3, title: "Review the session", body: "See speaking time, participation, and who has yet to speak." },
];

const SUGGESTIONS = countries.map((c) => ({ name: c.name, code: c.code, alias: c.alias }));

const SAMPLE_DELEGATES = [
  { id: "d1", country: "Argentina", countryDisplay: "Argentina", countryCode: "ARG", delegate: "A. Rivas", school: "Northgate" },
  { id: "d2", country: "Canada", countryDisplay: "Canada", countryCode: "CAN", delegate: "J. Mercier", school: "Lakeview" },
  { id: "d3", country: "Kenya", countryDisplay: "Kenya", countryCode: "KEN", delegate: "W. Otieno", school: "St. Mary" },
  { id: "d4", country: "Vietnam", countryDisplay: "Vietnam", countryCode: "VNM", delegate: "L. Pham", school: "Hillcrest" },
];

const STAGES = [
  { label: "Import the roster", body: "Upload the allocation sheet once. Countries, delegates, and schools come through matched." },
  { label: "Run the queue and clock", body: "Keep the speakers list and the timer moving without losing the room." },
  { label: "Call the vote", body: "Track the room and calculate the majority the moment debate closes." },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PreviewLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="theme-shell min-h-screen bg-[#f4f4f0] text-[#101010]">
      <style>{`
        @keyframes fan-drift { 0%,100% { transform: var(--fan-rest); } 50% { transform: var(--fan-drift); } }
        .fan-card { animation: fan-drift 7s ease-in-out infinite; }
        .word-dim { color: rgba(16,16,16,.16); transition: color .35s ease; }
        .word-lit { color: rgba(16,16,16,1); transition: color .35s ease; }
      `}</style>

      <Link
        to="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white/90 px-3 py-1.5 text-[11px] text-black/50 shadow-sm backdrop-blur-md transition hover:border-black/30 hover:text-black"
      >
        Design preview <ArrowUpRight size={12} /> back to site
      </Link>

      <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <div className="flex w-full max-w-2xl items-center justify-between gap-3 rounded-full border border-black/10 bg-white/85 px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,.06)] backdrop-blur-xl">
          <a href="#hero" onClick={(e) => { e.preventDefault(); scrollToId("hero"); }} className="logo-link pl-1.5">
            <Logo compact size="w-7" />
          </a>
          <nav className="hidden items-center gap-5 text-[13px] text-black/55 sm:flex">
            <a className="nav-link" href="#pitch" onClick={(e) => { e.preventDefault(); scrollToId("pitch"); }}>Why</a>
            <a className="nav-link" href="#rhythm" onClick={(e) => { e.preventDefault(); scrollToId("rhythm"); }}>Process</a>
            <a className="nav-link" href="#preview" onClick={(e) => { e.preventDefault(); scrollToId("preview"); }}>Product</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <a href="/#waitlist" className="button-primary hidden sm:inline-flex">Join waitlist <ArrowRight size={14} /></a>
            <button className="sandwich-toggle h-8 w-8 sm:hidden" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Open menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="absolute right-4 top-16 w-48 rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl sm:hidden">
            <a className="dropdown-link" href="#pitch" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollToId("pitch"); }}>Why</a>
            <a className="dropdown-link" href="#rhythm" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollToId("rhythm"); }}>Process</a>
            <a className="dropdown-link" href="#preview" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollToId("preview"); }}>Product</a>
            <a className="dropdown-link" href="/#waitlist">Join waitlist</a>
          </div>
        )}
      </header>

      <main id="hero">
        <Hero />
        <PitchReveal />
        <FeatureRhythm />
        <StickyPreview />
        <ClosingCta />
      </main>

      <footer className="bg-[#101010] py-8 text-white">
        <div className="page-container flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><Logo light /><p className="mt-2 text-xs text-white/40">From motion to resolution. This page is a design concept, not the live site.</p></div>
          <a
            href="https://github.com/Paul2556/Motion"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-white/30 transition-colors hover:text-white/50"
          >
            Fully open source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-black/10 pt-24">
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="page-container relative grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:py-16">
        <div className="flex flex-col justify-center">
          <span className="eyebrow w-fit">A more dynamic take · concept</span>
          <h1 className="fade-up-delay mt-5 text-[clamp(2.8rem,7vw,6rem)] font-medium leading-[0.88] tracking-[-0.06em]">
            From motion<br />to <span className="accent-text display-serif">resolution.</span>
          </h1>
          <p className="fade-up-delay-2 mt-5 max-w-md text-base leading-relaxed text-black/55">
            One live screen for the room: roster, queue, timer, and votes, so a chair's
            attention stays on the debate, not the spreadsheets.
          </p>
          <div className="fade-up-delay-2 mt-6 flex flex-wrap gap-2.5">
            <a href="/#waitlist" className="button-primary px-4 py-3">Join the waitlist <ArrowRight size={15} /></a>
            <a href="#preview" onClick={(e) => { e.preventDefault(); scrollToId("preview"); }} className="button-secondary px-4 py-3">See it in action</a>
          </div>
        </div>

        <div className="relative hidden min-h-[360px] lg:block">
          <FanCard rest="rotate(-7deg)" drift="rotate(-9deg) translateY(-6px)" className="left-4 top-0 w-[220px] border-[var(--accent)]/40 shadow-[0_20px_50px_rgba(154,91,58,.18)]">
            <div className="pointer-events-none flex scale-[0.62] origin-top-left items-center justify-center p-3" style={{ '--timer-remaining': '#9a5b3a', '--danger': '#ef4444', width: '161%', height: '161%' }}>
              <Timer initialTime={90} />
            </div>
          </FanCard>
          <FanCard rest="rotate(4deg)" drift="rotate(6deg) translateY(6px)" className="left-24 top-40 w-[260px]" style={{ animationDelay: "1.2s" }}>
            <div className="pointer-events-none bg-[#0d0d0d] p-3" style={{ '--accent-alt': '#4caf7d', '--accent-time': '#a37fd1', '--accent-duration': '#d4a24c', '--accent-topic': '#4a90e2' }}>
              <p className="ui-label mb-2">Motion</p>
              <p className="text-[11px] leading-relaxed text-white/70">
                India motions for a moderated caucus of <span style={{ color: 'var(--accent-duration)' }}>12 minutes</span> with <span style={{ color: 'var(--accent-time)' }}>2 minute</span> speaking time
              </p>
            </div>
          </FanCard>
          <FanCard rest="rotate(-3deg)" drift="rotate(-5deg) translateY(-5px)" className="left-2 top-[19rem] w-[210px]" style={{ animationDelay: "2.4s" }}>
            <div className="pointer-events-none space-y-2 bg-[#0d0d0d] p-3">
              <p className="ui-label mb-1">Up next</p>
              {[{ n: "Brazil", c: "BRA" }, { n: "Japan", c: "JPN" }, { n: "Ghana", c: "GHA" }].map((s) => (
                <div key={s.c} className="flex items-center gap-2 border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/75">
                  <Flag countryCode={s.c} /> {s.n}
                </div>
              ))}
            </div>
          </FanCard>
        </div>
      </div>
    </section>
  );
}

function FanCard({ rest, drift, className = "", style, children }) {
  return (
    <div
      className={`fan-card absolute overflow-hidden rounded-2xl border border-black/10 bg-[#0d0d0d] shadow-[0_20px_50px_rgba(0,0,0,.16)] ${className}`}
      style={{ '--fan-rest': rest, '--fan-drift': drift, transform: rest, ...style }}
    >
      {children}
    </div>
  );
}

// Scroll-linked word reveal: each word dims/lights based on how far the
// paragraph has traveled through a fixed band of the viewport.
function PitchReveal() {
  const ref = useRef(null);
  const [lit, setLit] = useState(0);
  const text = "Motion replaces the spreadsheets, timers, and paper tallies chairs already juggle, with one live screen built for the room.";
  const words = useMemo(() => text.split(" "), []);

  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const start = window.innerHeight * 0.85;
        const end = window.innerHeight * 0.35;
        const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
        setLit(Math.round(progress * words.length));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [words.length]);

  return (
    <section id="pitch" className="border-b border-black/10 py-10 sm:py-14">
      <div className="page-container">
        <p ref={ref} className="mx-auto max-w-3xl text-2xl font-medium leading-snug tracking-[-0.02em] sm:text-3xl">
          {words.map((w, i) => (
            <span key={i} className={i < lit ? "word-lit" : "word-dim"}>{w} </span>
          ))}
        </p>
      </div>
    </section>
  );
}

function FeatureRhythm() {
  return (
    <section
      id="rhythm"
      className="border-b border-black/10 py-10 text-white sm:py-16"
      style={{ background: "linear-gradient(180deg, #17110a 0%, #0d0d0d 65%)" }}
    >
      <div className="page-container">
        <p className="section-label text-white/40">The process</p>
        <h2 className="section-title mt-3">A clear line from roll call to resolution.</h2>
        <div className="mt-8 divide-y divide-white/10 border-t border-white/10 sm:mt-12">
          {STEPS.map((step, index) => <RhythmRow key={step.title} index={index} {...step} />)}
        </div>
      </div>
    </section>
  );
}

function RhythmRow({ icon: Icon, index, title, body }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-[auto_auto_1fr] items-center gap-4 py-4 transition-all duration-500 sm:grid-cols-[auto_auto_1fr_auto] sm:py-5"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-14px)", transitionDelay: `${index * 90}ms` }}
    >
      <span className="accent-text font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
      <Icon className="text-white/50" size={18} strokeWidth={1.5} />
      <h3 className="text-base font-medium sm:text-lg">{title}</h3>
      <p className="hidden max-w-xs text-sm text-white/40 sm:block">{body}</p>
    </div>
  );
}

// Sticky right-hand panel swaps between three real, live components as the
// matching caption on the left crosses the middle of the viewport.
function StickyPreview() {
  const stageRefs = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = stageRefs.current.indexOf(entry.target);
            if (index !== -1) setActive(index);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="preview" className="border-b border-black/10 bg-white py-10 sm:py-16">
      <div className="page-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <p className="section-label">The product</p>
          <h2 className="section-title mt-3 mb-4">Everything on the dais.</h2>
          {STAGES.map((stage, index) => (
            <div
              key={stage.label}
              ref={(el) => { stageRefs.current[index] = el; }}
              className="flex min-h-[52vh] flex-col justify-center border-t border-black/10 py-6 first:border-t-0 lg:min-h-[60vh]"
            >
              <span className={`font-mono text-xs transition-colors ${active === index ? "accent-text" : "text-black/30"}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={`mt-2 text-2xl font-medium tracking-[-0.02em] transition-colors sm:text-3xl ${active === index ? "text-black" : "text-black/30"}`}>
                {stage.label}
              </h3>
              <p className={`mt-2 max-w-sm text-sm transition-colors ${active === index ? "text-black/55" : "text-black/25"}`}>{stage.body}</p>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-black/10 bg-[#0d0d0d] shadow-[0_25px_70px_rgba(0,0,0,.16)]">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="h-[440px] p-4">
              {active === 0 && <RosterStage />}
              {active === 1 && <QueueTimerStage />}
              {active === 2 && <VoteStage />}
            </div>
            <div className="flex justify-center gap-1.5 border-t border-white/10 py-3">
              {STAGES.map((stage, index) => (
                <span key={stage.label} className={`h-1 rounded-full transition-all duration-300 ${active === index ? "w-7 bg-[var(--accent)]" : "w-3 bg-white/15"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RosterStage() {
  return (
    <div className="h-full border border-[var(--app-border)] bg-[var(--app-panel)]">
      <DelegateRoster
        className="h-full"
        delegates={SAMPLE_DELEGATES}
        renderRight={(d) => <span className="min-w-0 truncate text-xs text-[var(--app-text-faint)]">{d.delegate} · {d.school}</span>}
      />
    </div>
  );
}

function QueueTimerStage() {
  const [queue, setQueue] = useState([
    { id: "q1", country: "Germany" },
    { id: "q2", country: "Mexico" },
    { id: "q3", country: "Indonesia" },
  ]);

  return (
    <div className="grid h-full grid-cols-[auto_1fr] gap-3" style={{ '--timer-remaining': '#9a5b3a', '--danger': '#ef4444' }}>
      <div className="flex items-center justify-center border border-[var(--app-border)] bg-[var(--app-panel)] px-4">
        <div className="scale-[0.55]"><Timer initialTime={90} /></div>
      </div>
      <Queue queue={queue} setQueue={setQueue} suggestions={SUGGESTIONS} />
    </div>
  );
}

function VoteStage() {
  const [groups, setGroups] = useState([
    { name: "For", seats: 14, color: "#3987e5" },
    { name: "Against", seats: 9, color: "#c98500" },
  ]);

  function adjust(index, delta) {
    setGroups((prev) => {
      const partner = index === 1 ? 0 : 1;
      const moved = delta > 0 ? Math.min(delta, prev[partner].seats) : Math.max(delta, -prev[index].seats);
      if (moved === 0) return prev;
      return prev.map((g, i) => (i === index ? { ...g, seats: g.seats + moved } : i === partner ? { ...g, seats: g.seats - moved } : g));
    });
  }

  return (
    <div className="flex h-full items-center justify-center border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="w-full max-w-xs">
        <SeatChart groups={groups} onIncrement={(i) => adjust(i, 1)} onDecrement={(i) => adjust(i, -1)} />
      </div>
    </div>
  );
}

function ClosingCta() {
  return (
    <section className="py-14 sm:py-20" style={{ background: "linear-gradient(160deg, #101010 0%, #1c130a 100%)" }}>
      <div className="page-container text-center">
        <h2 className="mx-auto max-w-xl text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
          Bring the room back into <span className="accent-text display-serif">focus.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm text-white/45">
          Same waitlist as the real site, just a preview of where the design could go.
        </p>
        <a href="/#waitlist" className="button-primary mt-7 px-5 py-3">Join the waitlist <ArrowRight size={15} /></a>
      </div>
    </section>
  );
}

export default PreviewLandingPage;
