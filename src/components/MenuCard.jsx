import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// HomePage's menu entries (Resume Session, New Conference, Cloud Sessions,
// etc.) - a plain presentational card, no ConferenceService/AuthService
// coupling, so it drops in anywhere a "navigate or trigger an action" tile
// is needed (see LandingPage.jsx's ImportDemo for a non-HomePage use).
export default function MenuCard({
  title,
  subtitle,
  icon,
  to,
  onClick,
}) {
  const className = "group flex w-full items-center justify-between border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-left transition hover:border-[var(--app-border-hover)] hover:bg-[var(--app-hover)]";

  const content = (
    <>
      <div className="flex items-center gap-5">
        <div className="border border-[var(--app-border)] bg-[var(--app-chip)] p-4">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-medium text-[var(--app-text)]">
            {title}
          </h2>

          <p className="mt-1 text-sm text-[var(--app-text-muted)]">
            {subtitle}
          </p>
        </div>
      </div>

      <ChevronRight
        size={22}
        className="text-[var(--app-text-faint)] transition group-hover:translate-x-1"
      />
    </>
  );

  // onClick-driven cards (e.g. "New Conference" opening the file picker)
  // render as a plain button instead of a Link - there's no route to go to.
  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}
