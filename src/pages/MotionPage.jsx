import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Minus, Plus } from "lucide-react";
import Logo from "../components/Logo";
import MotionInput from "../components/MotionInput";
import MotionLog from "../components/MotionLog";
import SeatChart from "../components/SeatChart";
import NoCommitteeModal from "../components/NoCommitteeModal";
import { getVoteStatusLabel } from "../utils/voteStatus";
import { formatMotionSummary } from "../utils/motionSummary";
import ConferenceService from "../services/ConferenceService";

// Colors use the app's categorical palette (slot 1 blue, slot 3 yellow - see
// src/index.css / the dataviz skill's palette reference) rather than freehand hex picks.
// Abstain is opt-in, not always present - most procedural motions are strictly
// for/against, only some substantive votes allow abstention - see toggleAbstain.
function buildInitialGroups(delegateCount) {
  return [
    { name: "For", seats: 0, color: "var(--vote-for)" },
    { name: "Against", seats: delegateCount, color: "var(--vote-against)" },
  ];
}

function voteStorageKey(committeeId) {
  return `motion-vote-${committeeId}`;
}

// sessionStorage, same reasoning as ConferenceService: survives a refresh,
// still gone once the tab closes. Ignores a cache whose total seat count no
// longer matches the roster (e.g. a re-imported workbook with a different size).
// Sums every group present (2 without abstain, 3 with it) rather than
// hardcoding indices, since group count now varies.
function loadCachedVote(committeeId, delegateCount) {
  try {
    const raw = sessionStorage.getItem(voteStorageKey(committeeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const total = (parsed.groups ?? []).reduce((sum, group) => sum + (group.seats ?? 0), 0);
    return total === delegateCount ? parsed : null;
  } catch {
    return null;
  }
}

export default function MotionPage() {
  const navigate = useNavigate();
  const committee = ConferenceService.getActiveCommittee();
  const delegateCount = committee?.delegates.length ?? 0;
  const cachedVote = committee ? loadCachedVote(committee.id, delegateCount) : null;

  // Scope MotionInput's matching to delegations actually in this committee
  // (including non-country ones like press corps), not the full ISO list.
  const delegations = committee?.delegates.map((d) => ({ name: d.countryDisplay, code: d.countryCode })) ?? [];

  const [motionText, setMotionText] = useState(cachedVote?.motionText ?? "");
  const [groups, setGroups] = useState(cachedVote?.groups ?? buildInitialGroups(delegateCount));
  const [motionLog, setMotionLog] = useState(cachedVote?.motionLog ?? []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Hidden until a chair explicitly opens voting on a logged motion - null
  // means hidden, an entry means "voting is open for this motion".
  const [votingMotion, setVotingMotion] = useState(null);

  // Opening voting always starts the tally fresh - it's voting *on this
  // motion*, not a running total carried over from whatever was voted on
  // before it. Also marks it as the committee's active motion (a chair
  // reopening voting on an older logged motion is explicitly bringing it
  // back to the floor), which is what the /session timer's badge reads.
  function startVoting(entry) {
    setVotingMotion(entry);
    setGroups(buildInitialGroups(delegateCount));
    ConferenceService.setActiveMotion(entry);
  }

  // The most recently logged motion becomes the committee's active motion
  // too - most motions (procedural ones especially) govern the floor as
  // soon as they're moved, well before/without an explicit vote.
  function handleMotionSubmit(meta) {
    setMotionLog((prev) => [meta, ...prev]);
    ConferenceService.setActiveMotion(meta);
  }

  // votingMotion is already the committee's active motion (set in
  // startVoting) - re-setting here is just belt-and-suspenders so /session
  // picks up this exact passed motion even if something else changed the
  // active motion mid-vote.
  function continueToSession() {
    ConferenceService.setActiveMotion(votingMotion);
    navigate("/session");
  }

  useEffect(() => {
    if (!committee) return;
    try {
      sessionStorage.setItem(voteStorageKey(committee.id), JSON.stringify({ motionText, groups, motionLog }));
    } catch {
      // storage unavailable (private browsing, quota) - falls back to in-memory-only
    }
  }, [committee, motionText, groups, motionLog]);

  // Groups always sum to the committee's delegate count - each vote is a
  // delegate moving from one bloc to another, not an independent tally.
  // Against (index 1) is the shared default bucket both For and Abstain
  // exchange with - a delegate moves For<->Against or Abstain<->Against,
  // never directly between For and Abstain.
  const adjustVotes = useCallback((index, delta) => {
    setGroups((prev) => {
      const partner = index === 1 ? 0 : 1;
      const moved = delta > 0 ? Math.min(delta, prev[partner].seats) : Math.max(delta, -prev[index].seats);
      if (moved === 0) return prev;
      return prev.map((group, i) => {
        if (i === index) return { ...group, seats: group.seats + moved };
        if (i === partner) return { ...group, seats: group.seats - moved };
        return group;
      });
    });
  }, []);

  const allowAbstain = groups.length > 2;
  const voteStatus = getVoteStatusLabel([groups[0], groups[1]]);

  // Toggling on appends a fresh Abstain bucket; toggling off folds any
  // existing abstentions back into Against so the total never changes.
  function toggleAbstain() {
    setGroups((prev) => {
      if (prev.length > 2) {
        return [prev[0], { ...prev[1], seats: prev[1].seats + prev[2].seats }];
      }
      return [...prev, { name: "Abstain", seats: 0, color: "var(--vote-abstain)" }];
    });
  }

  useEffect(() => {
    function handleKeyDown(event) {
      // Don't hijack these keys while the user is typing the motion text.
      const tag = event.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (event.key === "1") {
        setSelectedIndex(0);
      } else if (event.key === "2") {
        setSelectedIndex(1);
      } else if (event.key === "3" && allowAbstain) {
        setSelectedIndex(2);
      } else if (event.key === "+" || event.key === "=") {
        adjustVotes(selectedIndex, 1);
      } else if (event.key === "-" || event.key === "_") {
        adjustVotes(selectedIndex, -1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, adjustVotes, allowAbstain]);

  if (!committee) return <NoCommitteeModal />;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <Link to="/home" className="flex items-center gap-3">
            <Logo light />
          </Link>
        </header>

        <div className={votingMotion ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" : "flex justify-center"}>
          <div className={`border border-white/10 bg-[#121212] p-6 ${votingMotion ? "" : "w-full max-w-2xl"}`}>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">Motion text</p>

            <MotionInput
              value={motionText}
              onChange={setMotionText}
              placeholder="You can type as naturally as you want"
              rows={8}
              className="mt-4"
              delegations={delegations}
              onSubmit={handleMotionSubmit}
            />

            <MotionLog
              entries={motionLog}
              onDelete={(index) => setMotionLog((prev) => prev.filter((_, i) => i !== index))}
              onVote={startVoting}
            />
          </div>

          {votingMotion && (
            <div className="border border-white/10 bg-[#121212] p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-xs text-white/50">Allow abstentions</p>

                <button
                  onClick={toggleAbstain}
                  role="switch"
                  aria-checked={allowAbstain}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                    allowAbstain ? "border-white/40 bg-white/30" : "border-white/10 bg-white/5"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      allowAbstain ? "translate-x-[22px]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {voteStatus === "Full House" && (
                <p className="mb-3 text-center text-2xl font-bold uppercase tracking-normal text-[var(--motion-accent)] whitespace-nowrap">
                  Full House
                </p>
              )}
              {voteStatus === "Super Majority" && (
                <p className="mb-3 text-center text-2xl uppercase tracking-normal text-[rgba(var(--motion-accent-rgb),0.8)] whitespace-nowrap">
                  Super Majority
                </p>
              )}
              {voteStatus === "Simple Majority" && (
                <p className="mb-3 text-center text-2xl uppercase tracking-normal text-white/45 whitespace-nowrap">
                  Simple Majority
                </p>
              )}

              {voteStatus && (
                <button
                  onClick={continueToSession}
                  className="mb-5 flex w-full items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium uppercase tracking-[0.14em] transition hover:border-white/20 hover:bg-white/10"
                >
                  
                  Continue to session
                  <ArrowRight size={15} />
                </button>
              )}

              <SeatChart
                title="Voting"
                subtitle={formatMotionSummary(votingMotion)}
                groups={[groups[0], groups[1]]}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onIncrement={(index) => adjustVotes(index, 1)}
                onDecrement={(index) => adjustVotes(index, -1)}
              />

              {allowAbstain && (
                <div className="-mx-2 mt-2 flex items-center justify-between border-t border-white/5 px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: groups[2].color }} />
                    <span className="text-sm text-white/80">Abstain</span>
                    <span className="rounded-none border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                      3
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-10 text-right text-sm text-white/50">{groups[2].seats}</span>

                    <div className="flex gap-1">
                      <button
                        onClick={() => adjustVotes(2, -1)}
                        aria-label="Decrease Abstain votes"
                        className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
                      >
                        <Minus size={12} />
                      </button>

                      <button
                        onClick={() => adjustVotes(2, 1)}
                        aria-label="Increase Abstain votes"
                        className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
