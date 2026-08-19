import { Link, useLocation } from "react-router-dom";
import { Keyboard } from "lucide-react";
import Logo from "./Logo";

// Renders a real <Link> when linked, a plain span otherwise - the landing
// page's live hero preview (LandingPage.jsx) renders this whole bar with
// linked={false} so a marketing visitor never gets routed away by it.
function NavItem({ to, linked, className, children }) {
  return linked ? (
    <Link to={to} className={className}>{children}</Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

const NAV_ITEMS = [
  { to: "/rollcall", label: "Roll Call" },
  { to: "/motion", label: "Motion", dot: true },
  { to: "/vote", label: "Vote" },
  { to: "/timer", label: "Timer" },
];

// Shared top bar for the committee-work pages (Session, Roll Call, Motion,
// Vote) - one place for the Roll Call/Motion/Vote nav so it can't drift
// between pages the way each page's header used to (see CLAUDE.md's Routing
// section: no shared layout wrapper means nothing else enforces this).
export default function AppTopBar({ committeeLabel, linked = true, onShowShortcuts }) {
  const location = useLocation();

  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <NavItem to="/home" linked={linked} className="flex items-center gap-3">
          <Logo compact light />
        </NavItem>
        {committeeLabel && (
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--app-text-muted)]">{committeeLabel}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {NAV_ITEMS.map(({ to, label, dot }) => {
          const active = linked && location.pathname === to;
          return (
            <NavItem
              key={to}
              to={to}
              linked={linked}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-none border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition ${
                active
                  ? "border-[var(--app-border-active)] bg-[var(--app-chip-active)] text-[var(--app-text)]"
                  : "border-[var(--app-border)] bg-[var(--app-chip)] text-[var(--app-text-secondary)] hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
              }`}
            >
              {dot && <span className="h-2.5 w-2.5 rounded-full bg-[var(--motion-accent)]" />}
              {label}
            </NavItem>
          );
        })}

        {linked && onShowShortcuts && (
          <button
            onClick={onShowShortcuts}
            aria-label="Keyboard shortcuts"
            className="inline-flex items-center gap-2 rounded-none border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-[var(--app-text-secondary)] transition hover:border-[var(--app-border-hover)] hover:bg-[var(--app-chip-active)]"
          >
            <Keyboard size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
