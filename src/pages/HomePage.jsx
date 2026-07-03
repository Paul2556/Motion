import {
  Play,
  FolderOpen,
  Plus,
  Settings,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import Logo from "../components/Logo";

function MenuCard({
  title,
  subtitle,
  icon,
  to,
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between border border-white/10 bg-[#151515] p-6 transition hover:border-white/20 hover:bg-[#1b1b1b]"
    >
      <div className="flex items-center gap-5">
        <div className="border border-white/10 bg-white/5 p-4">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-medium">
            {title}
          </h2>

          <p className="mt-1 text-sm text-white/40">
            {subtitle}
          </p>
        </div>
      </div>

      <ChevronRight
        size={22}
        className="text-white/20 transition group-hover:translate-x-1"
      />
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">

        {/* Header */}

        <header className="flex items-center justify-between border border-white/10 bg-[#111111] p-6">

          <Logo light/>

          <span className="border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
            Alpha
          </span>

        </header>

        {/* Main */}

        <div className="mt-8 grid flex-1 gap-8 xl:grid-cols-[1.6fr_.8fr]">

          {/* Left */}

          <div className="flex flex-col gap-5">

            <MenuCard
              title="Resume Session"
              subtitle="Continue chairing the active committee."
              icon={<Play size={24} />}
              to="/session"
            />

            <MenuCard
              title="Open Conference"
              subtitle="Load an existing conference workbook."
              icon={<FolderOpen size={24} />}
              to="#"
            />

            <MenuCard
              title="New Conference"
              subtitle="Create a new conference from Excel."
              icon={<Plus size={24} />}
              to="#"
            />
                      </div>

          {/* Right */}

          <div className="flex flex-col gap-5">

            {/* Conference Status */}

            <div className="flex-1 border border-white/10 bg-[#111111] p-6">

              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Conference Status
              </p>

              <div className="mt-8">

                <div className="flex h-16 w-16 items-center justify-center border border-dashed border-white/10 text-white/25">
                  📄
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  No Conference Loaded
                </h2>

                <p className="mt-3 leading-relaxed text-white/45">
                  Upload an Excel workbook to begin chairing a committee.
                </p>

              </div>

            </div>

            {/* Bottom */}

            <div className="grid grid-cols-2 gap-5">

              <Link
                to="/settings"
                className="group border border-white/10 bg-[#111111] p-6 transition hover:border-white/20 hover:bg-[#1b1b1b]"
              >
                <Settings
                  size={28}
                  className="text-white/70"
                />

                <h3 className="mt-6 text-lg font-medium">
                  Settings
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  Preferences and application options.
                </p>

              </Link>

              <Link
                to="/reports"
                className="group border border-white/10 bg-[#111111] p-6 transition hover:border-white/20 hover:bg-[#1b1b1b]"
              >
                <BarChart3
                  size={28}
                  className="text-white/70"
                />

                <h3 className="mt-6 text-lg font-medium">
                  Reports
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  Session analytics and exports.
                </p>

              </Link>

            </div>

          </div>

        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-white/35">

          <span>
            Motion Alpha
          </span>

          <span>
            From motion to resolution.
          </span>

        </footer>

      </div>

    </div>
  );
}