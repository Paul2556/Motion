import {
  Play,
  FolderOpen,
  Settings,
  BarChart3,
  ChevronRight,
  FileX,
  FileSpreadsheet,
  Cloud,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Logo from "../components/Logo";
import CommitteeIcon from "../components/CommitteeIcon";
import ConferenceService from "../services/ConferenceService";
import AuthService from "../services/AuthService";
import demoConferences from "../data/demoConferences";

const isDemoHost = window.location.hostname === "demo.motionmun.com";

function MenuCard({
  title,
  subtitle,
  icon,
  to,
  onClick,
}) {
  const className = "group flex w-full items-center justify-between border border-white/10 bg-[#151515] p-6 text-left transition hover:border-white/20 hover:bg-[#1b1b1b]";

  const content = (
    <>
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

export default function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Once a workbook is parsed, this holds its committees so the picker
  // modal can render - null means "no picker showing".
  const [pendingConference, setPendingConference] = useState(null);

  // demo.motionmun.com only - which bundled sample conference to pick from.
  const [showDemoPicker, setShowDemoPicker] = useState(false);

  const [loadedConference, setLoadedConference] = useState(() =>
    ConferenceService.isLoaded() ? ConferenceService.getConference() : null
  );

  // The active committee's own title (e.g. "United Nations Security Council"), not the overall
  // conference/workbook name - that's what CommitteeIcon matches against, since a real
  // conference's workbook name (e.g. "MUNXYZ 2026") won't itself name a committee.
  const activeCommitteeTitle =
    loadedConference?.committees?.[loadedConference.activeCommittee]?.committee ?? null;

  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  useEffect(() => AuthService.subscribe(setUser), []);

  async function handleFile(file) {
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      const conference = await ConferenceService.loadConference(file);
      const committees = ConferenceService.getCommittees();

      if (committees.length === 0) {
        setError("No committees found in that workbook.");
        return;
      }

      setPendingConference({ name: conference.name, committees });
    } catch (err) {
      console.error(err);
      setError("Failed to load workbook. Make sure it's a valid .xlsx allocation sheet.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectCommittee(id) {
    ConferenceService.setActiveCommittee(id);
    setLoadedConference(ConferenceService.getConference());
    setPendingConference(null);
    navigate("/rollcall");
  }

  // Feeds a bundled sample conference into the same "which committee are you chairing?"
  // picker used for uploaded workbooks, so nothing about that flow needs to change.
  function loadDemoConference(demo) {
    const conference = ConferenceService.loadDemoConference(demo);
    const committees = ConferenceService.getCommittees();

    setShowDemoPicker(false);
    setPendingConference({ name: conference.name, committees });
  }

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">

        {/* Header - same bare treatment as every other app-shell page's header
            (Settings/Motion/Stats/RollCall/GeneralVoting/Admin), not a bordered
            card. */}

        <header className="mb-8 flex items-center justify-between">

          <Link to="/home"><Logo light/></Link>

          <div className="flex items-center gap-3">
            <span className="border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
              {user ? (user.email ?? "Signed In") : "Signed Out"}
            </span>

            <span className="border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/50">
              Alpha
            </span>
          </div>

        </header>

        {/* Main */}

        <div className="grid flex-1 gap-8 xl:grid-cols-[1.6fr_.8fr]">

          {/* Left */}

          <div className="flex flex-col gap-5">

            <MenuCard
              title="Resume Session"
              subtitle="Continue chairing the active committee."
              icon={<Play size={24} />}
              to="/session"
            />

            <MenuCard
              title="New Conference"
              subtitle="Load a conference workbook to get started."
              icon={<FolderOpen size={24} />}
              onClick={() => fileInputRef.current?.click()}
            />

            <MenuCard
              title="Cloud Sessions"
              subtitle="Sign in to sync multi-day attendance."
              icon={<Cloud size={24} />}
              to="/cloud"
            />

            {isDemoHost && (
              <MenuCard
                title="Try a Demo Conference"
                subtitle="Load a bundled sample conference instead of your own workbook."
                icon={<Sparkles size={24} />}
                onClick={() => setShowDemoPicker(true)}
              />
            )}
                      </div>

          {/* Right */}

          <div className="flex flex-col gap-5">

            {/* Conference Status */}

            <div className="flex-1 border border-white/10 bg-[#111111] p-6">

              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                Conference Status
              </p>

              <div className="mt-8">

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div className="flex h-16 w-16 items-center justify-center border border-white/15 text-white">
                  <CommitteeIcon title={activeCommitteeTitle} size={24} fallback={<FileX size={24} />} />
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  {isLoading
                    ? "Loading…"
                    : loadedConference?.name
                    ? loadedConference.name
                    : "No Conference Loaded"}
                </h2>

                <p className="mt-3 leading-relaxed text-white/45">
                  {error
                    ? error
                    : loadedConference?.name
                    ? "Use New Conference to load a different workbook."
                    : "Use New Conference to load a workbook and get started."}
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
                to="/stats"
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

          {isDemoHost && (
            <Link to="/feedback" className="transition hover:text-white/60">
              Send Feedback
            </Link>
          )}

          <span>
            From motion to resolution.
          </span>

        </footer>

      </div>

      {showDemoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md border border-white/10 bg-[#111111] p-6">

            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-white/50" />
              <div>
                <h2 className="text-lg font-medium">Choose a demo conference</h2>
                <p className="text-xs text-white/40">Bundled sample data, no upload needed.</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {demoConferences.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => loadDemoConference(demo)}
                  className="flex w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
                >
                  <span className="font-medium">{demo.name}</span>
                  <span className="shrink-0 whitespace-nowrap pl-4 text-xs text-white/40">
                    {demo.committees.reduce((sum, committee) => sum + committee.delegates.length, 0)} delegates
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDemoPicker(false)}
              className="mt-4 w-full border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/5"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

      {pendingConference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md border border-white/10 bg-[#111111] p-6">

            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-white/50" />
              <div>
                <h2 className="text-lg font-medium">Which committee are you chairing?</h2>
                <p className="text-xs text-white/40">{pendingConference.name}</p>
              </div>
            </div>

            <div className="mt-6 max-h-80 space-y-2 overflow-y-auto">
              {pendingConference.committees.map((committee) => (
                <button
                  key={committee.id}
                  onClick={() => selectCommittee(committee.id)}
                  className="flex w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
                >
                  <span className="font-medium">{committee.committee}</span>
                  <span className="shrink-0 whitespace-nowrap pl-4 text-xs text-white/40">{committee.delegates.length} delegates</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setPendingConference(null)}
              className="mt-4 w-full border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/5"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

    </div>
  );
}