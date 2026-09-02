import { useEffect, useRef, useState } from "react";
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
import Timer from "../components/Timer";
import Queue from "../components/Queue";
import SeatChart from "../components/SeatChart";
import DelegateRoster from "../components/DelegateRoster";
import SessionBoard from "../components/SessionBoard";
import { countries } from "../constants";

// Same seed data the real landing page's hero preview uses (LandingPage.jsx) -
// kept local since that file stays untouched, not imported from it.
const HERO_SUGGESTIONS = countries.map((c) => ({ name: c.name, code: c.code, alias: c.alias }));
const HERO_SPEAKER = { country: "United Kingdom", countryCode: "GBR" };
const HERO_QUEUE = [
  { id: "hero-1", country: "Brazil", countryCode: "BRA" },
  { id: "hero-2", country: "Japan", countryCode: "JPN" },
  { id: "hero-3", country: "Ghana", countryCode: "GHA" },
];

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
  { label: "Keep time", body: "One precise, visible clock for speeches, caucuses, and yields." },
  { label: "Run the queue", body: "Keep the speakers list moving without losing the room." },
  { label: "Call the vote", body: "Track the room and calculate the majority the moment debate closes." },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PreviewLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="theme-shell min-h-screen bg-[#f4f4f0] text-[#101010]">
      <Link
        to="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white/90 px-3 py-1.5 text-[11px] text-black/50 shadow-sm backdrop-blur-md transition hover:border-black/30 hover:text-black"
      >
        Design preview <ArrowUpRight size={12} /> back to site
      </Link>

      <header className="fixed inset-x-0 top-4 z-40">
        <div className="page-container relative">
          <div className="flex items-center justify-between gap-3 rounded-full border border-black/10 bg-white/85 px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,.06)] backdrop-blur-xl">
            <a href="#hero" onClick={(e) => { e.preventDefault(); scrollToId("hero"); }} className="logo-link">
              <Logo compact size="w-7" />
            </a>
            <nav className="hidden items-center gap-6 text-[13px] text-black/55 sm:flex">
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
            <div className="absolute right-5 top-16 w-48 rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl sm:hidden">
              <a className="dropdown-link" href="#rhythm" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollToId("rhythm"); }}>Process</a>
              <a className="dropdown-link" href="#preview" onClick={(e) => { e.preventDefault(); setMenuOpen(false); scrollToId("preview"); }}>Product</a>
              <a className="dropdown-link" href="/#waitlist">Join waitlist</a>
            </div>
          )}
        </div>
      </header>

      <main id="hero">
        <Hero />
        <ScrollTimerScene />
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

// The right side is a single real, live SessionBoard preview - same
// component and seed data shape LandingPage.jsx's own hero uses - rather
// than a cluster of decorative cards, so there's one clear focal point.
function Hero() {
  return (
    <section className="relative border-b border-black/10 pt-24">
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="page-container relative py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mx-auto w-fit">A more dynamic take · concept</span>
          <h1 className="fade-up-delay mt-5 text-[clamp(2.8rem,7vw,6rem)] font-medium leading-[0.88] tracking-[-0.06em]">
            From motion<br />to <span className="accent-text display-serif">resolution.</span>
          </h1>
          <p className="fade-up-delay-2 mx-auto mt-5 max-w-md text-base leading-relaxed text-black/55">
            One live screen for the room: roster, queue, timer, and votes, so a chair's
            attention stays on the debate, not the spreadsheets.
          </p>
          <div className="fade-up-delay-2 mt-6 flex flex-wrap justify-center gap-2.5">
            <a href="/#waitlist" className="button-primary px-4 py-3">Join the waitlist <ArrowRight size={15} /></a>
            <a href="#preview" onClick={(e) => { e.preventDefault(); scrollToId("preview"); }} className="button-secondary px-4 py-3">See it in action</a>
          </div>
        </div>

        <div className="product-shell mx-auto mt-10 sm:mt-14">
          <div className="h-[860px] p-4 text-white sm:p-6" style={{ '--timer-remaining': '#9a5b3a', '--danger': '#ef4444', '--motion-accent': '#c98500' }}>
            <SessionBoard
              committeeLabel="DISEC"
              initialSpeaker={HERO_SPEAKER}
              initialQueue={HERO_QUEUE}
              activeMotion="Moderated Caucus: 72s / speaker"
              suggestions={HERO_SUGGESTIONS}
              linked={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// A proper scroll-scrubbed set piece, à la Apple product pages: a tall track
// with a sticky-pinned stage inside it. Progress is read straight off the
// track's position on every scroll event and applied with no easing/delay,
// so the ring drains (and refills, scrolling back up) in lockstep with the
// scrollbar rather than just fading in once on the way past - MUN's debate
// clock is the thing actually being chaired, not an arbitrary shape.
function ScrollTimerScene() {
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const raw = scrollable > 0 ? -rect.top / scrollable : 0;
        setProgress(Math.min(1, Math.max(0, raw)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const totalSeconds = 90;
  const remaining = Math.max(0, Math.ceil(totalSeconds * (1 - progress)));
  const overtime = progress >= 1;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * progress;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <section ref={trackRef} className="relative bg-[#0d0d0d]" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden text-white">
        <p className="section-label text-white/40">{overtime ? "Scroll back up to reset" : "Scroll to run the clock"}</p>
        <div className="relative mt-6 flex h-[280px] w-[280px] items-center justify-center sm:h-[360px] sm:w-[360px]">
          <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="160" cy="160" r={radius} fill="none" stroke="#242424" strokeWidth="4" />
            <circle
              cx="160" cy="160" r={radius} fill="none"
              stroke={overtime ? "#ef4444" : "var(--accent)"}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="text-center">
            <div className={`text-6xl font-light tracking-[-0.05em] sm:text-7xl ${overtime ? "text-red-400" : "text-white"}`}>
              {minutes}:{seconds}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/35">
              {overtime ? "Motion carried" : "Remaining"}
            </div>
          </div>
        </div>
        <p className="mt-8 max-w-xs text-center text-sm text-white/40">
          The clock runs with your scroll, not on its own - keep going, or scroll back to rewind it.
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

const STAGE_COMPONENTS = [RosterStage, TimerStage, QueueStage, VoteStage];

// Genuinely scroll-scrubbed, like ScrollTimerScene above: one continuous
// progress value read off the section's own position on every scroll event
// (no IntersectionObserver thresholds, no easing/delay), turned into a float
// across the four stages. Every stage stays mounted, cross-fading in and out
// by how close stageFloat sits to its index - so the panel moves smoothly
// with the scrollbar in both directions instead of snapping at a trigger line.
function StickyPreview() {
  const sectionRef = useRef(null);
  const [stageFloat, setStageFloat] = useState(0);

  useEffect(() => {
    let frame = null;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        const raw = scrollable > 0 ? -rect.top / scrollable : 0;
        const progress = Math.min(1, Math.max(0, raw));
        setStageFloat(progress * (STAGES.length - 1));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="preview" ref={sectionRef} className="border-b border-black/10 bg-white py-10 sm:py-16">
      <div className="page-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <p className="section-label">The product</p>
          <h2 className="section-title mt-3 mb-4">Everything on the dais.</h2>
          {STAGES.map((stage, index) => {
            const closeness = Math.max(0, 1 - Math.abs(stageFloat - index));
            return (
              <div key={stage.label} className="flex min-h-[52vh] flex-col justify-center border-t border-black/10 py-6 first:border-t-0 lg:min-h-[60vh]">
                <span className="font-mono text-xs" style={{ color: `rgba(var(--accent-rgb), ${0.3 + closeness * 0.7})` }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl" style={{ color: `rgba(16,16,16, ${0.28 + closeness * 0.72})` }}>
                  {stage.label}
                </h3>
                <p className="mt-2 max-w-sm text-sm" style={{ color: `rgba(16,16,16, ${0.22 + closeness * 0.48})` }}>{stage.body}</p>
              </div>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-black/10 bg-[#0d0d0d] shadow-[0_25px_70px_rgba(0,0,0,.16)]">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="relative h-[480px]">
              {STAGE_COMPONENTS.map((StageComponent, index) => {
                const opacity = Math.max(0, 1 - Math.abs(stageFloat - index));
                return (
                  <div
                    key={index}
                    className="absolute inset-4"
                    style={{ opacity, pointerEvents: opacity > 0.5 ? "auto" : "none" }}
                  >
                    <StageComponent />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-1.5 border-t border-white/10 py-3">
              {STAGES.map((stage, index) => {
                const closeness = Math.max(0, 1 - Math.abs(stageFloat - index));
                return (
                  <span
                    key={stage.label}
                    className="h-1 rounded-full bg-[var(--accent)]"
                    style={{ width: `${12 + closeness * 16}px`, opacity: 0.2 + closeness * 0.8 }}
                  />
                );
              })}
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

function TimerStage() {
  return (
    <div
      className="flex h-full items-center justify-center border border-[var(--app-border)] bg-[var(--app-panel)]"
      style={{ '--timer-remaining': '#9a5b3a', '--danger': '#ef4444' }}
    >
      <div className="scale-[0.78]"><Timer initialTime={90} /></div>
    </div>
  );
}

function QueueStage() {
  const [queue, setQueue] = useState([
    { id: "q1", country: "Germany" },
    { id: "q2", country: "Mexico" },
    { id: "q3", country: "Indonesia" },
  ]);

  return (
    <div className="h-full" style={{ '--danger': '#ef4444' }}>
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
    <div className="h-full border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <SeatChart groups={groups} onIncrement={(i) => adjust(i, 1)} onDecrement={(i) => adjust(i, -1)} />
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
