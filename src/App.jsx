import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import SessionPage from "./pages/SessionPage";
import RollCallPage from "./pages/RollCallPage";
import MotionPage from "./pages/MotionPage";
import SettingsPage from "./pages/SettingsPage";
import CloudSessionsPage from "./pages/CloudSessionsPage";
import DebugPage from "./pages/DebugPage";
import LicensePage from "./pages/LicensePage";
import SourceRequestPage from "./pages/SourceRequestPage";

// One deployment serves three custom domains (Vercel: attach all three to
// this same project) - which route tree mounts is decided at runtime from
// the hostname, since this is a plain client-rendered SPA with no per-domain
// server routing. Anything that isn't one of the two recognized production
// subdomains (localhost, Vercel preview *.vercel.app URLs, the original
// motion-navy.vercel.app default domain, IP addresses used for local network
// testing, etc.) falls back to the full combined route table below, so
// local dev and preview deploys can still reach every page without needing
// real subdomains wired up.
const APP_HOSTS = ["app.motionmun.com"];
const DEBUG_HOSTS = ["debug.motionmun.com"];
const MARKETING_HOSTS = ["motionmun.com", "www.motionmun.com"];

function MarketingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/licensing" element={<LicensePage />} />
      <Route path="/source" element={<SourceRequestPage />} />
    </Routes>
  );
}

function AppRoutes() {
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
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/cloud" element={<CloudSessionsPage />} />
    </Routes>
  );
}

function DebugRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DebugPage />} />
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
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/cloud" element={<CloudSessionsPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/licensing" element={<LicensePage />} />
      <Route path="/source" element={<SourceRequestPage />} />
    </Routes>
  );
}

export default function App() {
  const hostname = window.location.hostname;

  if (APP_HOSTS.includes(hostname)) return <AppRoutes />;
  if (DEBUG_HOSTS.includes(hostname)) return <DebugRoutes />;
  if (MARKETING_HOSTS.includes(hostname)) return <MarketingRoutes />;
  return <AllRoutes />;
}
