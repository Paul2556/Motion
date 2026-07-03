import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import SessionPage from "./pages/SessionPage";
import DebugPage from "./pages/DebugPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}