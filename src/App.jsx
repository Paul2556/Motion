import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import { APP_HOSTS, DEMO_HOSTS, DEBUG_HOSTS, MARKETING_HOSTS, isLocalDevHost } from "./hosts";
import LandingPage from "./pages/LandingPage";
import PreviewLandingPage from "./pages/PreviewLandingPage";
import HomePage from "./pages/HomePage";
import SessionPage from "./pages/SessionPage";
import RollCallPage from "./pages/RollCallPage";
import MotionPage from "./pages/MotionPage";
import GeneralVotingPage from "./pages/GeneralVotingPage";
import TimerPage from "./pages/TimerPage";
import SettingsPage from "./pages/SettingsPage";
import CloudSessionsPage from "./pages/CloudSessionsPage";
import StatsPage from "./pages/StatsPage";
import DebugPage from "./pages/DebugPage";
import ReferPage from "./pages/ReferPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import LicensePage from "./pages/LicensePage";
import FeedbackPage from "./pages/FeedbackPage";
import NotFoundPage from "./pages/NotFoundPage";
import OwnerGate from "./components/OwnerGate";

// One deployment serves four domains, so the route tree is chosen at runtime
// from the hostname. Unrecognized hosts fall back to the combined table, gated
// unless they're local dev (see isLocalDevHost below).

// /licensing only exists on the marketing domain (see MarketingRoutes below)
// - a full cross-origin redirect rather than <Navigate>, since that component
// only handles same-app client-side navigation and these are a different
// subdomain entirely.
function RedirectToMarketing({ path }) {
  useEffect(() => {
    window.location.replace(`https://motionmun.com${path}`);
  }, [path]);
  return null;
}

function MarketingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/licensing" element={<LicensePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// `includeFeedback` is only true for DemoRoutes below - /feedback is a
// demo-only escape hatch for early-access testers, not something the real
// app.motionmun.com production host should expose.
function AppRoutes({ includeFeedback = false } = {}) {
  return (
    <Routes>
      {/* HomePage is reachable at both "/" (the subdomain's root) and
          "/home" (so every existing `navigate("/home")`/`Link to="/home"`
          elsewhere in the app keeps working unchanged). */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/rollcall" element={<RollCallPage />} />
      <Route path="/motion" element={<MotionPage />} />
      <Route path="/vote" element={<GeneralVotingPage />} />
      <Route path="/timer" element={<TimerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/cloud" element={<CloudSessionsPage />} />
      <Route path="/stats" element={<StatsPage />} />
      {includeFeedback && <Route path="/feedback" element={<FeedbackPage />} />}
      <Route path="/licensing" element={<RedirectToMarketing path="/licensing" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

// Renders the same route tree as app.motionmun.com, minus the OwnerGate - demo.motionmun.com is
// a public, unauthenticated preview. The badge is a small fixed pill rather than a full-width
// banner that reserves layout space, since SessionPage uses h-screen/overflow-hidden calibrated
// to fit exactly one viewport; a fixed overlay floats on top without touching any page's layout.
function DemoBanner() {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[999] border border-amber-400/40 bg-amber-400/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black shadow-lg">
      Early Access Demo
    </div>
  );
}

// Same fixed-overlay reasoning as DemoBanner above (SessionPage's h-screen
// layout leaves no room for an in-flow footer), anchored to the bottom edge
// instead of a corner so it reads as a persistent disclaimer rather than a
// status badge.
function DemoFooter() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[999] border-t border-white/10 bg-black/85 px-3 py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-white/50 backdrop-blur-sm">
      Intended for computers, laptops, or tablets only
    </div>
  );
}

function DemoRoutes() {
  return (
    <>
      <DemoBanner />
      <AppRoutes includeFeedback />
      <DemoFooter />
    </>
  );
}

function DebugRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DebugPage />} />
      <Route path="/refer" element={<ReferPage />} />
      <Route path="/adminPanel" element={<AdminPanelPage />} />
      <Route path="/licensing" element={<RedirectToMarketing path="/licensing" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function AllRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/rollcall" element={<RollCallPage />} />
      <Route path="/motion" element={<MotionPage />} />
      <Route path="/vote" element={<GeneralVotingPage />} />
      <Route path="/timer" element={<TimerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/cloud" element={<CloudSessionsPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/debug/refer" element={<ReferPage />} />
      <Route path="/debug/adminPanel" element={<AdminPanelPage />} />
      <Route path="/licensing" element={<LicensePage />} />
      {/* Local/fallback-only design concept - never added to MarketingRoutes,
          so it's inert on the real motionmun.com domain even after this
          ships to main. See .claude/motion.md. */}
      <Route path="/previewlanding" element={<PreviewLandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  const hostname = window.location.hostname;

  if (APP_HOSTS.includes(hostname)) return <OwnerGate><AppRoutes /></OwnerGate>;
  if (DEMO_HOSTS.includes(hostname)) return <DemoRoutes />;
  if (DEBUG_HOSTS.includes(hostname)) return <OwnerGate><DebugRoutes /></OwnerGate>;
  if (MARKETING_HOSTS.includes(hostname)) return <MarketingRoutes />;
  if (isLocalDevHost(hostname)) return <AllRoutes />;
  // Anything else is reachable over the public internet, so it gets the same
  // owner gate as the real app host rather than the bare fallback.
  return <OwnerGate><AllRoutes /></OwnerGate>;
}
