import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Moon, Sun } from "lucide-react";

import Logo from "../components/Logo";
import { getAppTheme, setAppTheme, getAppReducedMotion, setAppReducedMotion } from "../appTheme";

function ThemeOption({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-3 border p-6 transition ${
        active
          ? "border-white/40 bg-white/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black/20">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {active && (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
          <Check size={12} /> Active
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [theme, setTheme] = useState(getAppTheme);
  const [reducedMotion, setReducedMotion] = useState(getAppReducedMotion);

  function chooseTheme(next) {
    setTheme(next);
    setAppTheme(next);
  }

  function toggleReducedMotion() {
    const next = !reducedMotion;
    setReducedMotion(next);
    setAppReducedMotion(next);
  }

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo compact light />
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Settings</span>
          </div>

          <Link
            to="/home"
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

        <div className="border border-white/10 bg-[#111111] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Theme</p>
          <p className="mt-2 text-sm text-white/45">Choose how Motion looks across the app.</p>

          <div className="mt-5 flex gap-4">
            <ThemeOption
              label="Black"
              icon={<Moon size={18} />}
              active={theme === "dark"}
              onClick={() => chooseTheme("dark")}
            />
            <ThemeOption
              label="White"
              icon={<Sun size={18} />}
              active={theme === "light"}
              onClick={() => chooseTheme("light")}
            />
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-[#111111] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">Reduced motion</p>
              <p className="mt-2 text-sm text-white/45">Turn off transitions and animations across the app.</p>
            </div>

            <button
              onClick={toggleReducedMotion}
              role="switch"
              aria-checked={reducedMotion}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                reducedMotion ? "border-white/40 bg-white/30" : "border-white/10 bg-white/5"
              }`}
            >
              <span
                data-motion-exempt
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  reducedMotion ? "translate-x-[22px]" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
