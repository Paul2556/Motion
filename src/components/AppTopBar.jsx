import { Link, useLocation } from "react-router-dom";
import { ChartNoAxesColumn, ClipboardCheck, Gavel, Keyboard, Mic, Timer, Vote } from "lucide-react";
import Logo from "./Logo";

// Renders a real <Link> when linked, a plain span otherwise - the landing
// page's live hero preview (LandingPage.jsx) renders this whole bar with
// linked={false} so a marketing visitor never gets routed away by it.
function NavItem({ to, linked, className, children, ...rest }) {
  return linked ? (
    <Link to={to} className={className} {...rest}>{children}</Link>
  ) : (
    <span className={className} {...rest}>{children}</span>
  );
}

const NAV_ITEMS = [
  { to: "/rollcall", label: "Roll Call", Icon: ClipboardCheck },
  { to: "/motion", label: "Motion", Icon: Gavel, dot: true },
  { to: "/session", label: "Session", Icon: Mic },
  { to: "/vote", label: "Vote", Icon: Vote },
  { to: "/timer", label: "Timer", Icon: Timer },
  { to: "/stats", label: "Stats", Icon: ChartNoAxesColumn },
];

// Shared top bar for the committee-work pages - one place for the nav so it
// can't drift between pages (see CLAUDE.md's Routing section: no shared layout
// wrapper means nothing else enforces this). The page you're on is a placard
// (the card a delegate raises), every other page is an icon that names itself
// on hover. `current` overrides the route for SessionBoard's landing preview.
export default function AppTopBar({ committeeLabel, linked = true, onShowShortcuts, current }) {
  const location = useLocation();
  const currentPath = current ?? location.pathname;
  const currentItem = NAV_ITEMS.find((item) => item.to === currentPath);

  return (
    <header className="flex h-14 shrink-0 items-stretch border-b border-[var(--app-border)] bg-[var(--app-bg)]">
      <NavItem
        to="/home"
        linked={linked}
        aria-label="Motion home"
        className="flex shrink-0 items-center gap-2 bg-[var(--app-text)] pl-3 pr-7 text-[var(--app-bg)] [clip-path:polygon(0_0,100%_0,calc(100%-20px)_100%,0_100%)] sm:min-w-[200px] sm:gap-3 sm:pl-5 sm:pr-9"
      >
        <Logo compact color="var(--app-bg)" size="w-[26px] shrink-0 sm:w-[30px]" />
        {currentItem && <span className="whitespace-nowrap text-lg font-extrabold tracking-[-0.03em] sm:text-2xl">{currentItem.label}</span>}
      </NavItem>

      <nav className="flex min-w-0 items-stretch sm:ml-2" aria-label="Pages">
        {NAV_ITEMS.filter((item) => item !== currentItem).map(({ to, label, Icon, dot }) => (
          <NavItem
            key={to}
            to={to}
            linked={linked}
            aria-label={label}
            title={label}
            className="group relative grid w-10 shrink-0 place-items-center text-[var(--app-text-muted)] outline-none transition hover:text-[var(--app-text)] focus-visible:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-text)] sm:w-16"
          >
            <Icon size={20} strokeWidth={1.75} />
            {dot && <span className="absolute right-2.5 top-3.5 h-[7px] w-[7px] rotate-45 bg-[var(--motion-accent)] sm:right-5" />}
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap bg-[var(--app-text)] px-2 py-1 text-xs font-semibold text-[var(--app-bg)] group-hover:block group-focus-visible:block">
              {label}
            </span>
          </NavItem>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-4 pr-3 text-[13px] text-[var(--app-text-muted)] sm:pr-5">
        {committeeLabel && <span className="hidden truncate md:inline">{committeeLabel}</span>}
        {linked && onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            className="hidden h-9 w-9 place-items-center transition sm:grid hover:text-[var(--app-text)] focus-visible:outline-2 focus-visible:outline-[var(--app-text)]"
          >
            <Keyboard size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </header>
  );
}
