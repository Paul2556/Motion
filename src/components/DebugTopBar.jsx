import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import AuthService from "../services/AuthService";
import { isOwner } from "../services/ownerAccess";
import { usePagePermission } from "../services/permissions";

// debug.motionmun.com mounts these at the root ("/", "/refer", "/adminPanel"
// - see DebugRoutes in App.jsx), but everywhere else (localhost, previews,
// the shared *.vercel.app domain) they're combined into AllRoutes under a
// "/debug" prefix instead. Same two-path-shapes problem DebugPage's own
// redirect effect already deals with, so it gets the same hostname check.
const ON_DEBUG_HOST = typeof window !== "undefined" && window.location.hostname === "debug.motionmun.com";
const BASE = ON_DEBUG_HOST ? "" : "/debug";
// DebugPage itself sits at BASE's root - "/" when BASE is empty, "/debug"
// (no trailing slash) when it isn't - matching how each route table actually
// registers it (DebugRoutes' "/" vs. AllRoutes' "/debug").
const DEBUG_HOME = ON_DEBUG_HOST ? "/" : "/debug";

const NAV_ITEMS = [
  { to: DEBUG_HOME, label: "Debug", permission: "debug" },
  { to: `${BASE}/adminPanel`, label: "Admin Panel", permission: "owner" },
  { to: `${BASE}/refer`, label: "Referrals", permission: "refer" },
];

// Shared nav for the debug-area pages (DebugPage, AdminPanelPage, ReferPage)
// - only shows links the signed-in user can actually reach, since access is
// split across two different systems (usePagePermission's delegable
// debug/refer permissions vs. AdminPanelPage's owner-only gate, kept
// deliberately separate) and a
// contributor with only one permission shouldn't see a link that would just
// bounce them back out.
export default function DebugTopBar() {
  const location = useLocation();
  const { allowed: debugAllowed } = usePagePermission("debug");
  const { allowed: referAllowed } = usePagePermission("refer");
  const [ownerAllowed, setOwnerAllowed] = useState(() => isOwner(AuthService.getCurrentUser()));

  useEffect(() => AuthService.subscribe((user) => setOwnerAllowed(isOwner(user))), []);

  const allowedByPermission = { debug: debugAllowed, refer: referAllowed, owner: ownerAllowed };
  const visibleItems = NAV_ITEMS.filter((item) => allowedByPermission[item.permission]);

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-3">
      <Link to={DEBUG_HOME} className="mr-1 inline-flex items-center gap-3">
        <Logo compact light />
      </Link>

      {visibleItems.length > 1 && visibleItems.map(({ to, label }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`inline-flex items-center whitespace-nowrap rounded-none border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition ${
              active
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
