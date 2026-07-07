import { useState } from "react";
import Logo from "../components/Logo";
import SeatChart from "../components/SeatChart";

// Placeholder vote tally, using the app's categorical palette (slot 1 blue,
// slot 3 yellow - see src/index.css / the dataviz skill's palette reference)
// rather than freehand hex picks.
const demoGroups = [
  { name: "For", seats: 20000, color: "#3987e5" },
  { name: "Against", seats: 20000, color: "#c98500" },
  { name: "Abstain", seats: 20000, color: "#666666" },
];

export default function MotionPage() {
  const [motionText, setMotionText] = useState("");

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Logo compact light />
          <span className="text-xs uppercase tracking-[0.18em] text-white/50">Motion</span>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="border border-white/10 bg-[#121212] p-6">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Motion text</p>

            <textarea
              value={motionText}
              onChange={(event) => setMotionText(event.target.value)}
              placeholder="Enter the motion up for a vote…"
              rows={8}
              className="mt-4 w-full resize-none border border-white/10 bg-white/5 p-4 text-sm text-white outline-none transition focus:border-white/30 placeholder:text-white/30"
            />
          </div>

          <div className="border border-white/10 bg-[#121212] p-6">
            <SeatChart
              title="Voting"
              subtitle="The motion (placeholder)"
              groups={demoGroups}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
