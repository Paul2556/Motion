import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import MarketingFooter from "../components/MarketingFooter";

const TEAM = [
  { name: "Taechaaukarakul", role: "Co-Founder" },
  { name: "Allanchakorn", role: "Co-Founder" },
];

function TeamMember({ member, index }) {
  return (
    <div className="bg-white p-6 sm:p-8">
      <span className="font-mono text-xs text-black/30">{String(index + 1).padStart(2, "0")}</span>
      <div className="mt-14 flex h-10 w-10 items-center justify-center border border-black/15 text-sm font-medium text-black/70">
        {member.name.charAt(0)}
      </div>
      <h3 className="mt-6 text-lg font-medium tracking-[-0.01em]">{member.name}</h3>
      <p className="mt-1 text-sm text-black/50">{member.role}</p>
    </div>
  );
}

export default function TeamPage() {
  // Read-only: the toggles live on LandingPage, this just follows them.
  const [darkMode] = useState(() => localStorage.getItem("motion-theme") === "dark");
  const [reducedMotion] = useState(() => localStorage.getItem("motion-reduced") === "true");

  return (
    <div
      className={`theme-shell flex min-h-screen flex-col text-[#101010] ${darkMode ? "theme-dark bg-black" : "bg-[#f4f4f0]"} ${reducedMotion ? "motion-reduced" : ""}`}
      data-theme={darkMode ? "dark" : "light"}
    >
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-[#f4f4f0]/90 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between">
          <Link to="/" className="logo-link"><Logo /></Link>
          <Link to="/" className="nav-link text-sm text-black/60">Back to home</Link>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <section className="border-b border-black/10">
          <div className="page-container py-20 text-center sm:py-28">
            <p className="section-label">Meet the team</p>
            <h1 className="section-title mx-auto mt-5 max-w-2xl">The people building <span className="accent-text display-serif">Motion.</span></h1>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white section-pad-sm">
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-lg leading-relaxed text-black/80 sm:text-xl">
                "Motion exists to close a gap every chair faces: the gap between someone who
                uses a tool and someone who depends on it. Motion does something different:
                it stays on the sideline. Chairs talk when they need to, and reach for
                Motion when they want to, not the other way around."
              </p>
              <p className="section-label mt-6">The Motion team</p>
            </div>
          </div>
        </section>

        <section className="section-pad">
          <div className="page-container">
            <div className="grid grid-cols-1 gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
              {TEAM.map((member, index) => (
                <TeamMember key={member.name} index={index} member={member} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
