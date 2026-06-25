import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  FileText,
  Import,
  LayoutTemplate,
  ListOrdered,
  Menu,
  MonitorUp,
  Moon,
  Pause,
  Play,
  Plus,
  Users,
  Vote,
  X,
  Sun,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    icon: Import,
    number: '01',
    title: 'Excel delegate import',
    body: 'Bring your roster in once. Countries, names, and voting status arrive ready for committee.',
    visual: <ImportVisual />,
  },
  {
    icon: ListOrdered,
    number: '02',
    title: 'Speaker queue management',
    body: 'Keep the general speakers list and moderated caucuses moving without losing the room.',
    visual: <QueueVisual />,
  },
  {
    icon: Clock3,
    number: '03',
    title: 'Built-in debate timers',
    body: 'One precise, visible clock for speeches, caucuses, and yields—controlled from the dais.',
    visual: <TimerVisual />,
  },
  {
    icon: Vote,
    number: '04',
    title: 'Voting & majority calculations',
    body: 'Track the room and calculate simple, two-thirds, and substantive majorities instantly.',
    visual: <VoteVisual />,
  },
  {
    icon: MonitorUp,
    number: '05',
    title: 'Resolution display',
    body: 'Present working papers, amendments, and draft resolutions without hunting through PDFs.',
    visual: <ResolutionVisual />,
  },
  {
    icon: LayoutTemplate,
    number: '06',
    title: 'Motion presets',
    body: 'Start with procedures tailored to your committee, then adjust the details that matter.',
    visual: <PresetVisual />,
  },
]

const steps = [
  ['01', 'Import committee', 'Upload the delegate roster and review voting status.'],
  ['02', 'Run debate', 'Control speakers, motions, and time from one view.'],
  ['03', 'Manage votes', 'Record decisions with the correct majority, instantly.'],
  ['04', 'Present resolutions', 'Move adopted work to the room-facing display.'],
]

function Logo({ compact = false, light = false }) {
  const color = light ? 'white' : 'black'
  return (
    <div className="flex items-center gap-2.5" aria-label="Motion">
      <svg width="34" height="24" viewBox="0 0 68 48" fill="none" aria-hidden="true">
        <circle cx="22" cy="24" r="20" fill={color} />
        <rect x="44" y="7" width="22" height="7" rx="3.5" fill={color} />
        <rect x="46" y="20.5" width="20" height="7" rx="3.5" fill={color} />
        <rect x="44" y="34" width="22" height="7" rx="3.5" fill={color} />
      </svg>
      {!compact && <span className="text-[15px] font-semibold tracking-[-0.02em]">Motion</span>}
    </div>
  )
}

function App() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [joinSpamCount, setJoinSpamCount] = useState(0)

  const handleWaitlistSubmit = async (event) => {
    event.preventDefault()

    if (submitted) return

    if (isSubmitting) {
      setJoinSpamCount((count) => count + 1)
      return
    }

    setJoinSpamCount(0)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('email', email)

      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbxg44fQCPZSKQGYGQcof6gHPSsouDjpwJcOt2kyZ1IhaMMuc-TZLHFgF9kNP02ykif2/exec',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (response.ok) {
        setSubmitted(true)
        setEmail('')
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
        <div className="page-container flex h-16 items-center justify-between">
          <a href="#top" className="logo-link shrink-0" onClick={handleHeaderLink}><Logo /></a>
          <nav className="hidden items-center gap-8 text-sm text-black/60 md:flex">
            <a className="nav-link" href="#problem" onClick={handleHeaderLink}>Why Motion</a>
            <a className="nav-link" href="#features" onClick={handleHeaderLink}>Features</a>
            <a className="nav-link" href="#how" onClick={handleHeaderLink}>How it works</a>
          </nav>
          <div className="flex items-center gap-1.5">
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
                Modern committee management for Model United Nations. Built to keep chairs focused on the room, not the software.
              </p>
              <div className="fade-up-delay-2 mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <a href="#waitlist" className="button-primary justify-center px-5 py-3.5">Join the waitlist <ArrowRight size={16} /></a>
                <a href="#features" className="button-secondary justify-center px-5 py-3.5">See features <ArrowDown size={16} /></a>
              </div>
            </div>

            <div className="product-shell mx-auto mt-20 max-w-6xl lg:mt-28">
              <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:px-5">
                <div className="flex items-center gap-3"><Logo compact light /><span className="text-xs text-white/45">DISEC</span></div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45"><span className="accent-bg h-1.5 w-1.5 rounded-full" /> Session live</div>
              </div>
              <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[1.35fr_.65fr]">
                <div className="border-b border-white/10 p-5 sm:p-7 md:border-b-0 md:border-r">
                  <div className="flex items-start justify-between">
                    <div><p className="ui-label">Active speech</p><h3 className="mt-2 text-xl font-medium text-white">United Kingdom</h3></div>
                    <span className="status-chip">Moderated caucus</span>
                  </div>
                  <div className="mt-10 flex flex-col items-center">
                    <div className="timer-ring flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
                      <div className="text-center"><span className="block text-5xl font-light tracking-[-0.06em] text-white sm:text-6xl">01:12</span><span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-white/35">remaining</span></div>
                    </div>
                    <div className="mt-7 flex gap-2"><button className="ui-button-muted">- 15s total</button><button className="ui-button"><Pause size={14} /> Pause</button><button className="ui-button-muted">+ 15s total</button></div>
                  </div>
                  <div className="mt-9 grid grid-cols-3 border-t border-white/10 pt-5 text-center">
                    <Metric value="9 min" label="Estimated" /><Metric value="02" label="Spoken" /><Metric value="04" label="Queued" />
                  </div>
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex items-center justify-between"><p className="ui-label">Up next</p><button className="text-white/40"><Plus size={16} /></button></div>
                  <div className="mt-5 space-y-2">
                    {['Brazil', 'Japan', 'Ghana', 'France'].map((country, index) => (
                      <div key={country} className="flex items-center justify-between border border-white/10 px-3.5 py-3 text-sm text-white/75">
                        <div className="flex items-center gap-3"><span className="text-xs tabular-nums text-white/25">{String(index + 1).padStart(2, '0')}</span>{country}</div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-xs text-white/35"><Plus size={13} /> Add speaker</button>
                  <div className="mt-8 border-t border-white/10 pt-5"><p className="ui-label">Current topic</p><p className="mt-3 text-sm leading-relaxed text-white/65">Discussing possible solutions to regional security</p><div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.12em] text-white/30"><span>10 minutes</span><span>90 sec / speaker</span></div></div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-black/35">One room. One system. Full control.</p>
          </div>
        </section>

        <section id="problem" className="section-pad border-b border-black/10 bg-white">
          <div className="page-container">
            <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-24">
              <div><p className="section-label">The problem</p><h2 className="section-title mt-5">Run committee.<br /><span className="text-black/25">Not spreadsheets.</span></h2></div>
              <div>
                <p className="max-w-2xl text-xl leading-relaxed text-black/60 sm:text-2xl">A chair’s attention belongs in the room—not scattered across tabs, files, and formulas.</p>
                <div className="mt-10 grid grid-cols-2 border-l border-t border-black/10 sm:grid-cols-4">
                  <Tool icon={FileText} label="Word" detail="Speakers" />
                  <Tool icon={Clock3} label="Timer" detail="Caucuses" />
                  <Tool icon={FileText} label="PDFs" detail="Resolutions" />
                  <Tool icon={FileSpreadsheet} label="Sheets" detail="Delegates" />
                </div>
                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-black/35"><div className="h-px flex-1 bg-black/10" /><ChevronRight size={16} /><div className="h-px flex-1 bg-black/10" /></div>
                <div className="flex items-center justify-between border border-black bg-black p-5 text-white sm:p-7">
                  <Logo light />
                  <span className="text-sm text-white/60">One platform.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section-pad border-b border-black/10">
          <div className="page-container">
            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div><p className="section-label">Core features</p><h2 className="section-title mt-5">Everything on the dais.<br />Nothing in the way.</h2></div>
              <p className="max-w-sm text-sm leading-relaxed text-black/50">Six focused tools replace the patchwork—without changing the procedure chairs and delegates already know.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden border border-black/10 bg-black/10 md:grid-cols-2 lg:mt-20 ">
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
                  <div className="step-icon mt-14 h-10 w-10 border border-white/20 p-2.5 transition-colors">{index === 0 ? <Import size={18} /> : index === 1 ? <Play size={18} /> : index === 2 ? <Vote size={18} /> : <MonitorUp size={18} />}</div>
                  <h3 className="mt-6 text-lg font-medium">{title}</h3><p className="mt-3 text-sm leading-relaxed text-white/45">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad border-b border-black/10 bg-white">
          <div className="page-container">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-24">
              <div className="relative aspect-square max-w-xl overflow-hidden bg-[#ededE8] p-8 sm:p-12">
                <div className="absolute inset-0 vision-lines opacity-50" />
                <div className="relative flex h-full flex-col justify-between">
                  <Logo compact />
                  <div className="mx-auto flex items-center gap-3 self-center">
                    <div className="h-28 w-28 rounded-full bg-black sm:h-36 sm:w-36" />
                    <div className="space-y-3"><div className="h-4 w-24 rounded-full bg-black sm:w-32" /><div className="h-4 w-28 rounded-full bg-black sm:w-36" /><div className="h-4 w-28 rounded-full bg-black sm:w-36" /><div className="h-4 w-24 rounded-full bg-black sm:w-32" /></div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-black/35">Motion / 2026</span>
                </div>
              </div>
              <div><p className="section-label">Our vision</p><blockquote className="mt-6 text-4xl font-medium leading-[1.05] tracking-[-0.045em] sm:text-6xl"><span className="accent-text">“</span>Built by delegates.<br />Designed for chairs.<span className="accent-text">“</span></blockquote><p className="mt-8 max-w-lg text-lg leading-relaxed text-black/55">Motion removes the operational friction around debate while preserving what makes Model United Nations matter: procedure, diplomacy, and the people in the room.</p><div className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.15em]"><span className="accent-bg h-px w-10" /> From motion to resolution.</div></div>
            </div>
          </div>
        </section>

        <section id="waitlist" className="relative overflow-hidden bg-[#f4f4f0] py-24 sm:py-32">
          <div className="hero-grid absolute inset-0 opacity-40" />
          <div className="page-container relative text-center">
            <p className="section-label">Early access</p>
            <h2 className="mx-auto mt-6 max-w-4xl text-5xl font-medium leading-[.95] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Bring the room<br />back into <span className="accent-text">focus.</span></h2>
            <p className="mx-auto mt-7 max-w-lg text-base leading-relaxed text-black/50">Join chairs and conference organizers building a better committee experience.</p>
            <form className="mx-auto mt-9 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={handleWaitlistSubmit}>
              <label className="sr-only" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@conference.org"
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
          <div className="flex flex-col gap-3 text-sm text-white/50 sm:items-end"><div className="flex gap-6"><a className="hover:text-white" href="#features">Features</a><a className="hover:text-white" href="#how">Process</a><a className="hover:text-white" href="#waitlist">Waitlist</a></div><span className="text-xs text-white/25">© 2026 Motion</span></div>
        </div>
      </footer>
    </div>
  )
}

function Metric({ value, label }) { return <div><span className="block text-lg text-white">{value}</span><span className="text-[9px] uppercase tracking-[0.15em] text-white/30">{label}</span></div> }
function Tool({ icon: Icon, label, detail }) { return <div className="border-b border-r border-black/10 bg-[#f8f8f5] p-4 sm:p-5"><Icon size={18} strokeWidth={1.5} /><p className="mt-8 text-sm font-medium">{label}</p><p className="mt-1 text-xs text-black/35">{detail}</p></div> }
function FeatureCard({ icon: Icon, index, number, title, body, visual }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(() => !('IntersectionObserver' in window))

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
      className={`feature-card-reveal bg-white ${visible ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 5) * 115}ms` }}
    >
      <div className="feature-card group flex-1 min-h-[400px] flex-col bg-[#f4f4f0] p-6 transition-colors hover:bg-white sm:p-8">
        <div className="flex items-center justify-between"><Icon className="accent-text" size={20} strokeWidth={1.5} /><span className="accent-text font-mono text-[10px]">{number}</span></div>
        <div className="my-9 flex flex-1 items-center justify-center overflow-visible">{visual}</div>
        <h3 className="text-xl font-medium tracking-[-0.025em]">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-black/50">{body}</p>
      </div>
    </article>
  )
}

function ImportVisual() { return <div className="w-full max-w-xs border border-black/15 bg-white p-3 shadow-[0_14px_40px_rgba(0,0,0,.06)]"><div className="flex items-center gap-2 border-b border-black/10 pb-3"><FileSpreadsheet size={17} /><span className="text-xs font-medium">delegates.xlsx</span><span className="ml-auto text-[9px] text-black/35">24 rows</span></div><div className="space-y-2 pt-3">{['Argentina', 'Canada', 'Kenya'].map((x, i) => <div className="flex items-center gap-2 text-[10px]" key={x}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[8px] text-white">{i + 1}</span><span>{x}</span><span className="ml-auto text-black/30">Voting</span></div>)}</div></div> }
function QueueVisual() { return <div className="w-full max-w-xs space-y-2">{['Germany', 'Mexico', 'Indonesia'].map((x, i) => <div className={`flex items-center border px-3 py-3 text-xs ${i === 0 ? 'border-black bg-black text-white' : 'border-black/15 bg-white'}`} key={x}><span className="mr-3 font-mono text-[9px] opacity-40">0{i + 1}</span>{x}<Users size={13} className="ml-auto opacity-35" /></div>)}</div> }
function TimerVisual() { return <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-black/15 bg-white"><svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="45.5" fill="none" stroke="black" strokeWidth="1.5" strokeDasharray="225 295" /></svg><div className="text-center"><span className="block text-3xl font-light tracking-[-0.05em]">00:48</span><span className="text-[8px] uppercase tracking-[.16em] text-black/35">REMAINING</span></div></div> }function VoteVisual() { return <div className="relative z-10 w-full max-w-xs"><div className="flex h-24 items-end gap-1.5">{[68, 43, 23].map((h, i) => <div className={`${i === 0 ? 'accent-bg' : 'bg-black'} flex-1 transition-colors duration-300`} style={{height: `${h}%`}} key={h}><span className="sr-only">{i}</span></div>)}</div><div className="mt-2 grid grid-cols-3 text-center text-[9px] uppercase tracking-[.1em] text-black/35"><span>For 14</span><span>Abst. 3</span><span>Against 2</span></div><div className="mt-4 flex items-center gap-2 border-t border-black/10 pt-3 text-xs"><Check className="accent-text" size={13} /><span>Motion passes</span><span className="ml-auto text-black/35">10 required</span></div></div> }
function ResolutionVisual() { return <div className="relative h-36 w-52"><div className="absolute left-0 top-3 h-32 w-24 border border-black/10 bg-white" /><div className="absolute right-0 top-0 h-36 w-40 border border-black/15 bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,.06)]"><div className="h-1.5 w-16 bg-black" /><div className="mt-4 space-y-2">{[80, 100, 88, 94, 60].map(x => <div key={x} className="h-px bg-black/20" style={{width: `${x}%`}} />)}</div><div className="mt-5 border-l-2 border-black pl-2 text-[8px] leading-relaxed">Draft resolution<br />1.1</div></div></div> }
function PresetVisual() { return <div className="grid w-full max-w-xs grid-cols-2 gap-2">{['Unmoderated', 'Moderated', 'COTW', 'Custom'].map((x, i) => <div key={x} className={`flex aspect-[1.6] items-end border p-3 text-xs ${i === 0 ? 'border-black bg-black text-white' : 'border-black/15 bg-white'}`}><LayoutTemplate className="mr-auto" size={14} /><span>{x}</span></div>)}</div> }

export default App
