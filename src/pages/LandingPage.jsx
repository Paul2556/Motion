import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Import,
  LayoutTemplate,
  ListOrdered,
  Menu,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Sparkles,
  Vote,
  X,
  Sun,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import AllocationParser from "../services/AllocationParser"
import DelegateRoster from "../components/DelegateRoster"
import MenuCard from "../components/MenuCard"
import Queue from "../components/Queue"
import Timer from "../components/Timer"
import SeatChart from "../components/SeatChart"
import { getVoteStatusLabel } from "../utils/voteStatus"
import MotionInput from "../components/MotionInput"
import SessionBoard from "../components/SessionBoard"
import { MOTIONS, countries } from "../constants"

// The hero preview's seed data - a snapshot of what a real committee mid-session
// looks like. Suggestions use the full ISO list (constants.js's `countries`)
// rather than a committee roster, since no real committee is loaded here.
const HERO_SUGGESTIONS = countries.map((c) => ({ name: c.name, code: c.code, alias: c.alias }))
const HERO_SPEAKER = { country: "United Kingdom", countryCode: "GBR" }
const HERO_QUEUE = [
  { id: "hero-1", country: "Brazil", countryCode: "BRA" },
  { id: "hero-2", country: "Japan", countryCode: "JPN" },
  { id: "hero-3", country: "Ghana", countryCode: "GHA" },
  { id: "hero-4", country: "France", countryCode: "FRA" },
]

const features = [
  {
    icon: Import,
    number: '01',
    title: 'Excel delegate import',
    body: 'Upload the allocation sheet once. Countries, delegate names, and schools come through with flags matched.',
    visual: <ImportDemo />,
  },
  {
    icon: ListOrdered,
    number: '02',
    title: 'Speaker queue management',
    body: 'Keep the general speakers list and moderated caucuses moving without losing the room.',
    visual: <QueueDemo />,
  },
  {
    icon: Clock3,
    number: '03',
    title: 'Built-in debate timers',
    body: 'One precise, visible clock for speeches, caucuses, and yields controlled from the dais.',
    visual: <TimerDemo />,
  },
  {
    icon: Vote,
    number: '04',
    title: 'Voting & majority calculations',
    body: 'Track the room and calculate simple majority, two-thirds, and full house instantly.',
    visual: <VoteDemo />,
  },
  {
    icon: Sparkles,
    number: '05',
    title: 'Natural language motions',
    body: 'Text editor meets MUN, type a motion the way you’d say it, and Motion parses the type, duration, and topic instantly.',
    visual: <MotionInputDemo />,
  },
  {
    icon: LayoutTemplate,
    number: '06',
    title: 'Custom motion presets',
    body: 'Start with procedures tailored to your committee, then adjust the details that matter.',
    visual: <PresetDemo />,
  },
]

const steps = [
  ['01', 'Import committee', 'Upload the delegate roster and review voting status.'],
  ['02', 'Run debate', 'Control speakers, motions, and time from one view.'],
  ['03', 'Manage votes', 'Record decisions with the correct majority, instantly.'],
  ['04', 'Review the session', 'See speaking time, participation, and who has yet to speak.'],
]

const FAQ_ITEMS = [
  ['What is Model United Nations?', 'MUN is an educational simulation where students act as country delegates, debating global issues and negotiating resolutions through the same procedures used at the real UN.'],
  ['Who is Motion for?', 'Chairs running an MUN committee: importing the delegate roster, running debate, managing votes, and keeping time, all from one screen.'],
  ['Do I need to install anything?', 'No. Motion runs in your browser. Upload a delegate roster and you are ready to chair.'],
  ['Is our conference data stored anywhere?', 'No, at least not fully. Motion has backend to store conference ONLY when logged in this is for multi-day conferences, if not, a loaded conference lives only in your browser tab for that session, and closing the tab clears it completely. No traces, no worries.'],
  ['Is Motion open source?', 'Yes, the full source is public on GitHub.'],
]

import Logo from "../components/Logo";

function LandingPage() {
  const fullPlaceholder = "you@conference.org";

  const [email, setEmail] = useState("");
  // Honeypot - see FeedbackPage.jsx for the same pattern. A real visitor
  // never sees or fills this in, but naive bots that autofill every input do.
  const [company, setCompany] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [joinSpamCount, setJoinSpamCount] = useState(0);

  const [placeholder, setPlaceholder] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  const waitlistRef = useRef(null);
  const hasAnimated = useRef(false);

  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;

        hasAnimated.current = true;

        setTimeout(() => {
          let i = 0;

          const interval = setInterval(() => {
            if (i <= fullPlaceholder.length) {
              setPlaceholder(fullPlaceholder.slice(0, i));
              i++;
            } else {
              clearInterval(interval);
              observer.disconnect();
            }
          }, 80);
        }, 300);
      },
      {
        threshold: 0.4,
      }
    );

    if (waitlistRef.current) {
      observer.observe(waitlistRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const handleWaitlistSubmit = async (event) => {
    event.preventDefault()

    if (submitted) return

    // Silently pretend to succeed rather than short-circuiting visibly -
    // same as api/waitlist/welcome.js's own server-side honeypot handling, so a
    // bot gets no signal it was caught.
    if (company) {
      setSubmitted(true)
      setEmail('')
      return
    }

    if (isSubmitting) {
      setJoinSpamCount((count) => count + 1)
      return
    }

    setJoinSpamCount(0)
    setIsSubmitting(true)

    const submittedEmail = email

    try {
      const formData = new FormData()
      formData.append('email', email)

      // Attribution - read at submit time, not capture-on-load, so it still
      // reflects the query string even after in-page anchor navigation
      // (sweepTo's history.replaceState only touches the hash, so this is
      // safe either way, but submit-time is simplest: no extra state/effect
      // needed to stash it earlier). Empty string (not omitted) for any
      // field that's absent, so the sheet gets a consistent column shape.
      const params = new URLSearchParams(window.location.search)
      formData.append('utm_source', params.get('utm_source') || '')
      formData.append('utm_medium', params.get('utm_medium') || '')
      formData.append('utm_campaign', params.get('utm_campaign') || '')
      formData.append('referrer', document.referrer || '')

      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbyz-FDNfNmrr2uLRqZJxCUa_O5pFwAs7BvL4ke-raSru_6pC1In4JM1B2thPnrADmIY/exec',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (response.ok) {
        setSubmitted(true)
        setEmail('')

        // Best-effort - the Sheet write above is the source of truth for the signup itself, so
        // a failed welcome email shouldn't surface as a failed signup. Still logged loudly
        // though: a non-ok response doesn't reject fetch()'s promise on its own, so this has to
        // check response.ok explicitly or a 4xx/5xx here fails completely silently.
        fetch('/api/waitlist/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: submittedEmail }),
        }).then(async (welcomeResponse) => {
          if (!welcomeResponse.ok) {
            console.error('Waitlist welcome email failed:', welcomeResponse.status, await welcomeResponse.text())
          }
        }).catch((error) => {
          console.error('Waitlist welcome email failed:', error)
        })
      }
    } catch (error) {
      console.error('Waitlist submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('motion-theme') === 'dark')
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('motion-reduced') === 'true')

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current
      localStorage.setItem('motion-theme', next ? 'dark' : 'light')
      return next
    })
  }

  const toggleReducedMotion = () => {
    setReducedMotion((current) => {
      const next = !current
      localStorage.setItem('motion-reduced', next ? 'true' : 'false')
      return next
    })
  }

  const sweepTo = (id) => {
    const target = id ? document.getElementById(id) : document.documentElement
    if (!target) return
    const startY = window.scrollY
    const targetY = Math.max(0, target.getBoundingClientRect().top + startY - 64)
    const distance = targetY - startY
    if (reducedMotion) {
      window.scrollTo(0, targetY)
      window.history.replaceState(null, '', `#${id}`)
      return
    }
    const duration = Math.min(2200, Math.max(1100, Math.abs(distance) * 0.5))
    const startedAt = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      window.scrollTo(0, startY + distance * eased)
      if (progress < 1) requestAnimationFrame(animate)
      else window.history.replaceState(null, '', `#${id}`)
    }
    requestAnimationFrame(animate)
  }

  const handlePageClick = (event) => {
    const anchor = event.target.closest('a[href^="#"]')
    if (!anchor) return
    event.preventDefault()
    sweepTo(anchor.getAttribute('href').slice(1))
  }

  const handleHeaderLink = (event) => {
    event.preventDefault()
    event.stopPropagation()
    sweepTo(event.currentTarget.getAttribute('href').slice(1))
  }

  return (
    <div className={`theme-shell min-h-screen overflow-hidden text-[#101010] ${darkMode ? 'theme-dark bg-black' : 'bg-[#f4f4f0]'} ${reducedMotion ? 'motion-reduced' : ''}`} data-theme={darkMode ? 'dark' : 'light'} onClick={handlePageClick}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-[#f4f4f0]/90 backdrop-blur-xl">
        <div className="page-container grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <a href="#top" className="logo-link shrink-0 justify-self-start" onClick={handleHeaderLink}><Logo /></a>
          <nav className="hidden items-center gap-8 text-sm text-black/60 md:flex">
            <a className="nav-link" href="#problem" onClick={handleHeaderLink}>Why Motion</a>
            <a className="nav-link" href="#features" onClick={handleHeaderLink}>Features</a>
            <a className="nav-link" href="#how" onClick={handleHeaderLink}>How it works</a>
            <a className="nav-link" href="#faq" onClick={handleHeaderLink}>FAQ</a>
          </nav>
          <div className="flex items-center justify-self-end gap-1.5">
            <a href="#waitlist" className="button-primary hidden md:inline-flex" onClick={handleHeaderLink}>Join the waitlist <ArrowRight size={15} /></a>
            <button className={`sandwich-toggle ${menuOpen ? 'is-active' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open site menu">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="page-container relative">
            <div className="sandwich-menu absolute right-5 top-2 w-[min(21rem,calc(100vw-2.5rem))] border border-black/10 bg-[#f4f4f0]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,.12)] backdrop-blur-xl sm:right-8 lg:right-12">
              <div className="border-b border-black/10 p-2 md:hidden">
                <a className="dropdown-link" href="#problem" onClick={(event) => { setMenuOpen(false); handleHeaderLink(event) }}>Why Motion</a>
                <a className="dropdown-link" href="#features" onClick={(event) => { setMenuOpen(false); handleHeaderLink(event) }}>Features</a>
                <a className="dropdown-link" href="#how" onClick={(event) => { setMenuOpen(false); handleHeaderLink(event) }}>How it works</a>
                <a className="dropdown-link" href="#faq" onClick={(event) => { setMenuOpen(false); handleHeaderLink(event) }}>FAQ</a>
                <a className="dropdown-link" href="#waitlist" onClick={(event) => { setMenuOpen(false); handleHeaderLink(event) }}>Join the waitlist</a>
              </div>
              <div className="space-y-1 p-2">
                <button className="dropdown-control" onClick={toggleTheme} type="button">
                  <span className="dropdown-control-icon">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</span>
                  <span>
                    <span className="block text-sm font-medium">{darkMode ? 'Light mode' : 'Dark mode'}</span>
                    <span className="block text-xs text-black/40">Switch the interface contrast.</span>
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-black/35">{darkMode ? 'On' : 'Off'}</span>
                </button>
                <button className="dropdown-control" onClick={toggleReducedMotion} type="button" aria-pressed={reducedMotion}>
                  <span className="dropdown-control-icon">{reducedMotion ? <Pause size={16} /> : <Play size={16} />}</span>
                  <span>
                    <span className="block text-sm font-medium">Reduced motion</span>
                    <span className="block text-xs text-black/40">Control page sweeps and reveal fades.</span>
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-black/35">{reducedMotion ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative border-b border-black/10 pt-16">
          <div className="hero-grid absolute inset-0 opacity-50" />
          <div className="page-container relative py-20 sm:py-28 lg:py-36">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="fade-up-delay mt-7 text-[clamp(3.6rem,9vw,8.4rem)] font-medium leading-[0.86] tracking-[-0.075em]">
                From motion<br />to <span className="accent-text">resolution.</span>
              </h1>
              <p className="fade-up-delay-2 mx-auto mt-8 max-w-xl text-lg leading-relaxed text-black/55 sm:text-xl">
                Modern committee management for Model United Nations, the simulation where students debate and vote as country delegates. Built to keep chairs focused on the room, not the software.
              </p>
              <div className="fade-up-delay-2 mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <a href="#waitlist" className="button-primary justify-center px-5 py-3.5">Join the waitlist <ArrowRight size={16} /></a>
                <a href="#features" className="button-secondary justify-center px-5 py-3.5">See features <ArrowDown size={16} /></a>
              </div>
            </div>

            <div className="product-shell mx-auto mt-20 lg:mt-28">
              {/* The real SessionBoard (src/components/SessionBoard.jsx) - the same
                  Timer/Queue used on the actual /session route, just seeded with
                  demo data and `linked=false` so the header buttons don't route a
                  visitor off the marketing page. Outside .app-shell here, so
                  --timer-remaining, --danger (Timer's overtime state), --motion-accent
                  (the Motion nav button's dot), and the base text-white it normally
                  inherits from that class are all supplied directly. */}
              <div className="h-[860px] p-4 text-white sm:p-6" style={{ '--timer-remaining': '#b7774d', '--danger': '#ef4444', '--motion-accent': '#fbbf24' }}>
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
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-black/35">One room. One system. Full control.</p>
          </div>
        </section>

        <section className="border-b border-black/10 section-pad-sm">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="section-label text-base sm:text-lg">What is Motion?</p>
              <p className="mt-4 text-base leading-relaxed text-black/60 sm:text-lg">
                Motion is software for running Model United Nations debate. It replaces
                the spreadsheets, timers, and documents chairs normally juggle with one
                screen: import your delegate list, run the speaker queue and clock, and
                record votes as they happen.
              </p>
            </div>
          </div>
        </section>

        <section id="problem" className="section-pad border-b border-black/10 bg-white">
          <div className="page-container">
            <div className="grid gap-12 lg:grid-cols-[0.6fr_1.4fr] lg:gap-24">
              <div><p className="section-label">The problem</p><h2 className="section-title mt-5">Run the committee.<br /><span className="text-black/25">Not spreadsheets.</span></h2></div>
              <div>
                <p className="max-w-2xl text-xl leading-relaxed text-black/60 sm:text-2xl">A chair’s attention belongs in the room, not scattered across tabs, files, and formulas.</p>
                <ToolReveal />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-pad border-b border-black/10">
          <div className="page-container">
            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div><p className="section-label">Core features</p><h2 className="section-title mt-5">Everything on the dais.<br />Nothing in the way.</h2></div>
              <p className="max-w-sm text-sm leading-relaxed text-black/50">Six focused tools replace the patchwork, without changing the procedure chairs and delegates already know.</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden border border-black/10 bg-black/10 md:grid-cols-2 lg:mt-20 ">
              {features.map((feature, index) => <FeatureCard key={feature.title} index={index} {...feature} />)}
            </div>
          </div>
        </section>

        <section id="how" className="section-pad border-b border-black/10 bg-[#101010] text-white">
          <div className="page-container">
            <div className="max-w-2xl"><p className="section-label text-white/40">How it works</p><h2 className="section-title mt-5">A clear line from roll call to resolution.</h2></div>
            <div className="relative mt-14 grid gap-px bg-white/10 lg:mt-20 lg:grid-cols-4">
              {steps.map(([number, title, body], index) => (
                <div key={title} className="group relative bg-[#101010] p-6 sm:p-8">
                  <div className="flex items-center justify-between"><span className="font-mono text-xs text-white/30">{number}</span>{index < 3 && <ArrowRight className="hidden text-white/20 lg:block" size={17} />}</div>
                  <div className="step-icon mt-14 h-10 w-10 border border-white/20 p-2.5 transition-colors">{index === 0 ? <Import size={18} /> : index === 1 ? <Play size={18} /> : index === 2 ? <Vote size={18} /> : <BarChart3 size={18} />}</div>
                  <h3 className="mt-6 text-lg font-medium">{title}</h3><p className="mt-3 text-sm leading-relaxed text-white/45">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="section-pad border-b border-black/10">
          <div className="page-container">
            <div><p className="section-label">Questions</p><h2 className="section-title mt-5">Before you join.</h2></div>
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:mt-20">
              {FAQ_ITEMS.map(([question, answer]) => <FaqItem key={question} question={question} answer={answer} />)}
            </div>
          </div>
        </section>

        <section ref={waitlistRef} id="waitlist" className="relative overflow-hidden bg-[#f4f4f0] py-24 sm:py-32">
          <div className="hero-grid hero-grid-float absolute inset-0 opacity-40" />
          <div className="page-container relative text-center">
            <p className="section-label">Early access</p>
            <h2 className="mx-auto mt-6 max-w-4xl text-5xl font-medium leading-[.95] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Bring the room<br />back into <span className="accent-text">focus.</span></h2>
            <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-black/50">Join chairs and conference organizers to build a cleaner, smoother, more focused MUN experience.</p>
            <form className="mx-auto mt-9 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={handleWaitlistSubmit}>
              <div
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <label className="sr-only" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={
                  email || isFocused
                    ? ""
                    : placeholder + (cursorVisible ? "|" : "")
                }
                className="min-w-0 flex-1 border border-black/15 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-black"
              />
              <button
                className="button-primary justify-center px-5 py-3.5"
                type="submit"
              >
                {submitted ? (
                  'Joined ✓'
                ) : isSubmitting ? (
                  joinSpamCount >= 10 ? (
                    "Either you have ADHD or you're very impatient..."
                  ) : joinSpamCount >= 5 ? (
                    'We heard you...'
                  ) : joinSpamCount >= 2 ? (
                    'Still joining...'
                  ) : (
                    'Joining...'
                  )
                ) : (
                  <>
                    Join the waitlist
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
            <p className="mt-3 text-[11px] text-black/35">
              {submitted ? (
                <strong className="text-black">
                  Thank you for joining Motion.
                  <br />
                  We'll reach out when early access becomes available.
                </strong>
              ) : (
                'No noise. Just product updates and early access.'
              )}
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-[#101010] py-10 text-white">
        <div className="page-container flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div><Logo light /><p className="mt-4 text-sm text-white/40">From motion to resolution.</p></div> 
          <div className="flex flex-col gap-3 text-sm text-white/50 sm:items-end">
            <div className="flex gap-6">
              <a className="hover:text-white" href="#features">Features</a>
              <a className="hover:text-white" href="#how">Process</a>
              <a className="hover:text-white" href="#faq">FAQ</a>
              <a className="hover:text-white" href="#waitlist">Waitlist</a>
            </div>
            <a
              href="https://github.com/Paul2556/Motion"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 leading-none text-xs text-white/30 transition-colors hover:text-white/50"
            >
              Fully open source on GitHub. Licensed under the Motion Attribution License.
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Tool({ icon: Icon, label, detail }) { return <div className="border-b border-r border-black/10 bg-[#f8f8f5] p-4 sm:p-5"><Icon size={18} strokeWidth={1.5} /><p className="mt-8 text-sm font-medium">{label}</p><p className="mt-1 text-xs text-black/35">{detail}</p></div> }

const PROBLEM_TOOLS = [
  { icon: FileText, label: 'Word', detail: 'Speakers' },
  { icon: Clock3, label: 'Timer', detail: 'Caucuses' },
  { icon: FileText, label: 'PDFs', detail: 'Resolutions' },
  { icon: FileSpreadsheet, label: 'Sheets', detail: 'Delegates' },
]

// The tiles start collapsed under the button (see .tool-push in index.css) so
// clicking it visibly "pushes" them out to their grid positions, rather than
// the section just sitting static on load like a diagram.
function ToolReveal() {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="mt-10">
      <button
        type="button"
        onClick={() => setRevealed(true)}
        aria-expanded={revealed}
        className="flex w-full items-center justify-between border border-black bg-black p-5 text-left text-white transition-colors hover:bg-black/85 sm:p-7"
      >
        <Logo light />
        <span className="flex flex-col items-end gap-1">
          <span className="text-sm text-white/60">One platform.</span>
          {!revealed && <span className="text-[9px] uppercase tracking-[0.16em] text-white/40">Click to see what it replaces</span>}
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${revealed ? 'grid-rows-[1fr] mt-5' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 border-l border-t border-black/10 sm:grid-cols-4">
            {PROBLEM_TOOLS.map((tool, index) => (
              <div key={tool.label} className={`tool-push ${revealed ? 'is-visible' : ''}`} style={{ transitionDelay: `${index * 80}ms` }}>
                <Tool icon={tool.icon} label={tool.label} detail={tool.detail} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white p-6 sm:p-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h3 className="text-base font-medium">{question}</h3>
        <ChevronRight size={16} className={`faq-chevron shrink-0 text-black/30 transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>
      <div className={`faq-panel grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-black/50">{answer}</p>
        </div>
      </div>
    </div>
  )
}
function FeatureCard({ icon: Icon, index, number, title, body, visual }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(
    typeof window === "undefined" || !("IntersectionObserver" in window)
  );

  useEffect(() => {
    const card = cardRef.current
    if (!card) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.22 },
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={cardRef}
      className={`feature-card-reveal min-w-0 bg-white ${visible ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 5) * 115}ms` }}
    >
      <div className="feature-card group min-w-0 flex-1 min-h-[400px] flex-col bg-[#f4f4f0] p-6 transition-colors hover:bg-white sm:p-8">
        <div className="flex items-center justify-between"><Icon className="accent-text" size={20} strokeWidth={1.5} /><span className="accent-text font-mono text-[10px]">{number}</span></div>
        <div className="my-9 flex flex-1 flex-col items-center justify-center gap-3 overflow-visible">
          <span className="self-start text-[9px] uppercase tracking-[0.16em] text-black/25">Live demo: try it</span>
          {visual}
        </div>
        <h3 className="text-xl font-medium tracking-[-0.025em]">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-black/50">{body}</p>
      </div>
    </article>
  )
}

// Sample roster shown until a visitor picks a real .xlsx - at that point
// this runs the actual AllocationParser (same parser HomePage.jsx uses),
// not a simulated reveal, so what's on screen is a genuine parse of
// whatever file they choose. Otherwise the real HomePage.jsx flow: the same
// hidden file input + MenuCard ("New Conference" is a click-to-open file
// picker in the real app - there's no drag-and-drop UI to replicate), then
// the real DelegateRoster either way.
const SAMPLE_DELEGATES = [
  { id: 'd1', country: 'Argentina', countryDisplay: 'Argentina', countryCode: 'ARG', delegate: 'A. Rivas', school: 'Northgate' },
  { id: 'd2', country: 'Canada', countryDisplay: 'Canada', countryCode: 'CAN', delegate: 'J. Mercier', school: 'Lakeview' },
  { id: 'd3', country: 'Kenya', countryDisplay: 'Kenya', countryCode: 'KEN', delegate: 'W. Otieno', school: 'St. Mary' },
  { id: 'd4', country: 'Vietnam', countryDisplay: 'Vietnam', countryCode: 'VNM', delegate: 'L. Pham', school: 'Hillcrest' },
]

function ImportDemo() {
  const [loaded, setLoaded] = useState(false)
  const [delegates, setDelegates] = useState(SAMPLE_DELEGATES)
  const [source, setSource] = useState(null) // null (sample) | filename | "error"
  const fileInputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    try {
      const parsed = await new AllocationParser().load(file)
      // First committee with an actual roster - a marketing demo has no
      // "which committee are you chairing?" picker to fall back on, so it
      // just shows whichever sheet the real parser found delegates in first.
      const committee = parsed.committees.find((c) => c.delegates.length > 0)
      if (!committee) throw new Error("no delegates found")

      // Shaped like the real delegate record (ConferenceService.toDelegateRecord)
      // so DelegateRoster can render these directly - country/countryDisplay/
      // countryCode/school come straight off AllocationParser's own output.
      setDelegates(committee.delegates.map((d, i) => ({
        id: `${committee.id}-${i}`,
        country: d.country ?? '',
        countryDisplay: d.countryDisplay ?? d.country ?? '',
        countryCode: d.countryCode ?? null,
        delegate: d.name ?? '',
        school: d.school ?? '',
      })))
      setSource(file.name)
    } catch {
      // Not a fair ask that every visitor has a real allocation sheet handy -
      // falls back to the sample roster rather than a dead-end error card.
      setDelegates(SAMPLE_DELEGATES)
      setSource("error")
    }
    setLoaded(true)
  }

  // .product-demo (see other demos on this page) keeps this dark regardless
  // of the landing page's own light/dark toggle, matching how the real app
  // always looks - same reasoning as QueueDemo/TimerDemo/VoteDemo below.
  return (
    <div className="product-demo w-full max-w-sm shadow-[0_14px_40px_rgba(0,0,0,.25)]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        // Cleared on click, not after reading it - a file input's onChange
        // only fires when its value actually changes, so picking the exact
        // same file twice in a row would silently do nothing the second
        // time without this (a real bug, not just a demo shortcut: the
        // same trap exists in HomePage.jsx's own handleFile input today).
        onClick={(event) => { event.target.value = "" }}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {loaded ? (
        // h-[300px] matches QueueDemo's own fixed height (its sibling demo
        // box in this grid) - without it this box was only as tall as
        // however many sample rows happened to render, reading smaller than
        // the demo next to it.
        <div className="flex h-[300px] flex-col border border-[var(--app-border)] bg-[var(--app-panel)]">
          {source && (
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3">
              <FileSpreadsheet size={15} className="text-[var(--app-text-secondary)]" />
              <span className="truncate text-xs font-medium text-[var(--app-text)]">
                {source === "error" ? "Couldn't read that file, here's a sample" : source}
              </span>
              <span className="ml-auto shrink-0 text-[9px] text-[var(--app-text-faint)]">{delegates.length} rows</span>
            </div>
          )}
          <DelegateRoster
            className="flex-1"
            delegates={delegates}
            renderRight={(d) => <span className="min-w-0 truncate text-xs text-[var(--app-text-faint)]">{d.delegate} · {d.school}</span>}
          />
        </div>
      ) : (
        <MenuCard
          title="New Conference"
          subtitle="Load a conference workbook to get started."
          icon={<FolderOpen size={24} />}
          onClick={() => fileInputRef.current?.click()}
          showArrow={false}
        />
      )}
    </div>
  )
}

// The real Queue component (src/components/Queue.jsx) - controlled, no
// service coupling, so it drops in here with nothing but local demo state.
function QueueDemo() {
  const [queue, setQueue] = useState([
    { id: 'q1', country: 'Germany' },
    { id: 'q2', country: 'Mexico' },
    { id: 'q3', country: 'Indonesia' },
  ])

  return (
    // text-white here, not on Queue.jsx itself - its icon buttons rely on
    // inheriting a white text color, which its native dark .app-shell pages
    // provide ambiently but this light landing page doesn't. Wider than the
    // other cards deliberately: Queue's own lg:p-8 padding plus its 3
    // always-reserved (opacity-0 until hover) row icons need more room than
    // max-w-xs gives before content clips. --danger supplied directly too,
    // for its remove-speaker button - same reasoning as TimerDemo.
    <div className="product-demo h-[300px] w-full max-w-sm text-white" style={{ '--danger': '#ef4444' }}>
      <Queue queue={queue} setQueue={setQueue} />
    </div>
  )
}

// The real Timer component. Its ring is a fixed 320px SVG with no size prop,
// so unlike the others here it's shrunk with a scale transform inside a
// clipped, fixed-height frame rather than by narrowing its container.
// It also reads --timer-remaining/--danger off an .app-shell ancestor
// normally; outside that theme system here, so both CSS vars it needs are
// supplied directly rather than pulling in the whole app-shell cascade.
function TimerDemo() {
  return (
    <div
      className="product-demo flex h-[340px] w-full max-w-sm items-center justify-center overflow-hidden border border-black/15 bg-[#0d0d0d] p-6 shadow-[0_14px_40px_rgba(0,0,0,.10)]"
      style={{ '--timer-remaining': '#b7774d', '--danger': '#ef4444' }}
    >
      <div className="origin-center scale-[0.65]">
        <Timer initialTime={90} />
      </div>
    </div>
  )
}

// Mirrors MotionPage.jsx's real voting model exactly, abstain toggle
// included: groups always sum to a fixed delegate count, and a vote is a
// delegate moving between blocs - For<->Against, or (when abstain is
// switched on) Abstain<->Against - never an independent per-bloc tally.
// Abstain is opt-in there because most procedural motions are strictly
// for/against; only some substantive votes allow abstention.
const VOTE_DELEGATE_COUNT = 23

function VoteDemo() {
  const [groups, setGroups] = useState([
    { name: 'For', seats: 0, color: '#3987e5' },
    { name: 'Against', seats: VOTE_DELEGATE_COUNT, color: '#c98500' },
  ])
  const allowAbstain = groups.length > 2
  const voteStatus = getVoteStatusLabel([groups[0], groups[1]])

  function adjustVotes(index, delta) {
    setGroups((prev) => {
      const partner = index === 1 ? 0 : 1
      const moved = delta > 0 ? Math.min(delta, prev[partner].seats) : Math.max(delta, -prev[index].seats)
      if (moved === 0) return prev
      return prev.map((group, i) => {
        if (i === index) return { ...group, seats: group.seats + moved }
        if (i === partner) return { ...group, seats: group.seats - moved }
        return group
      })
    })
  }

  function toggleAbstain() {
    setGroups((prev) => (prev.length > 2
      ? [prev[0], { ...prev[1], seats: prev[1].seats + prev[2].seats }]
      : [...prev, { name: 'Abstain', seats: 0, color: '#7a7a7a' }]))
  }

  return (
    <div className="product-demo w-full max-w-xs border border-black/15 bg-[#0d0d0d] p-5 shadow-[0_14px_40px_rgba(0,0,0,.10)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs text-white/50">Allow abstentions</p>
        <button
          onClick={toggleAbstain}
          role="switch"
          aria-checked={allowAbstain}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition ${allowAbstain ? 'border-white/40 bg-white/30' : 'border-white/10 bg-white/5'}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${allowAbstain ? 'translate-x-[20px]' : 'translate-x-0'}`} />
        </button>
      </div>

      {voteStatus === "Full House" && (
        <p className="mb-3 text-center text-2xl font-bold uppercase tracking-normal text-amber-400 whitespace-nowrap">
          Full House
        </p>
      )}
      {voteStatus === "Super Majority" && (
        <p className="mb-3 text-center text-2xl uppercase tracking-normal text-amber-400/80 whitespace-nowrap">
          Super Majority
        </p>
      )}
      {voteStatus === "Simple Majority" && (
        <p className="mb-3 text-center text-2xl uppercase tracking-normal text-white/45 whitespace-nowrap">
          Simple Majority
        </p>
      )}

      <SeatChart
        groups={[groups[0], groups[1]]}
        onIncrement={(i) => adjustVotes(i, 1)}
        onDecrement={(i) => adjustVotes(i, -1)}
      />

      {allowAbstain && (
        <div className="-mx-2 mt-2 flex items-center justify-between border-t border-white/5 px-2 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: groups[2].color }} />
            <span className="text-sm text-white/80">Abstain</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-10 text-right text-sm text-white/50">{groups[2].seats}</span>

            <div className="flex gap-1">
              <button onClick={() => adjustVotes(2, -1)} className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10">
                <Minus size={12} />
              </button>
              <button onClick={() => adjustVotes(2, 1)} className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// The real MotionInput component (src/components/MotionInput.jsx) - the same
// fuzzy natural-language parser used on the live Motion page. Omitting
// `delegations` entirely (rather than a small demo list) makes it fall back
// to MotionInput's own built-in full country + historical-country list, so
// any real delegation name a visitor types is recognized.
function MotionInputDemo() {
  const [value, setValue] = useState('India motions for a moderated caucus of 12 minutes on the topic of discussing possible solutions to nuclear disarmament with 2 minute speaking time')

  return (
    <div
      className="product-demo w-full max-w-lg border border-black/15 bg-[#0d0d0d] p-4 shadow-[0_14px_40px_rgba(0,0,0,.10)]"
      // MotionInput highlights each category (motion/delegation/speaking-time/
      // total-time/topic) via CSS vars that only exist inside .app-shell
      // (themes.css) - --accent already resolves here via the landing page's
      // own theme-shell system, but these four don't exist outside
      // .app-shell at all, so they'd otherwise render invisible (inherited
      // white text) rather than colored. Values match .app-shell's dark mode.
      style={{ '--accent-alt': '#4caf7d', '--accent-time': '#a37fd1', '--accent-duration': '#d4a24c', '--accent-topic': '#4a90e2' }}
    >
      <MotionInput value={value} onChange={setValue} placeholder="Type a motion..." rows={3} fuzzyLevel={0.3} />
    </div>
  )
}

// Pulled from the real MOTIONS vocabulary (src/constants.js) rather than
// hardcoded chip labels, so the detail line below is always the actual
// canonical phrasing/aliases Motion recognizes - unless a preset sets its
// own `detail`, which overrides that lookup for the description only (the
// button label is always just `label`).
const PRESET_PICKS = [
  { match: 'Open a Moderated Caucus', label: 'Moderated Caucus\n20 min 1 min', detail: 'Open a Moderated Caucus for 20 minutes with 1 minute speaking time with prompted topic' },
  { match: 'Open an Unmoderated Caucus', label: 'Unmoderated\n15 min', detail: 'Open an Unmoderated Caucus for 15 minutes' },
  { match: 'Introduce a Draft Resolution', label: 'Draft Resolution\n40 min', detail: 'Open an Unmoderated Caucus for 40 minutes' },
  { match: 'Move into Voting Procedure', label: 'Crisis COTW\n10 min', detail: 'Open a Consultation of the Whole for 10 minutes'},
].map((preset) => ({ ...preset, motion: MOTIONS.find((m) => m.text === preset.match) }))

function PresetDemo() {
  const [selected, setSelected] = useState(0)
  const activePreset = PRESET_PICKS[selected]
  const active = activePreset.motion

  return (
    <div className="w-full max-w-sm">
      <div className="grid grid-cols-2 gap-2">
        {PRESET_PICKS.map((preset, i) => (
          <button
            key={preset.match}
            onClick={() => setSelected(i)}
            className={`flex aspect-[1.6] flex-col justify-end border p-3 text-left text-xs transition ${i === selected ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black/30'}`}
          >
            <LayoutTemplate className="mb-auto" size={14} />
            <span className="whitespace-pre-line">{preset.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 border-t border-black/10 pt-3 text-xs text-black/45">
        <span className="font-medium text-black/70">{activePreset.detail ?? active.text}</span>
        {!activePreset.detail && active.alias?.length ? `, also recognized as "${active.alias[0]}"` : null}
      </p>
    </div>
  )
}

export default LandingPage
