import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import MotionInput from "../components/MotionInput";
import MotionLog from "../components/MotionLog";
import SeatChart from "../components/SeatChart";
import ConferenceService from "../services/ConferenceService";

// Colors use the app's categorical palette (slot 1 blue, slot 3 yellow - see
// src/index.css / the dataviz skill's palette reference) rather than freehand hex picks.
function buildInitialGroups(delegateCount) {
  return [
    { name: "For", seats: 0, color: "#3987e5" },
    { name: "Against", seats: delegateCount, color: "#c98500" },
  ];
}

function voteStorageKey(committeeId) {
  return `motion-vote-${committeeId}`;
}

// sessionStorage, same reasoning as ConferenceService: survives a refresh,
// still gone once the tab closes. Ignores a cache whose total seat count no
// longer matches the roster (e.g. a re-imported workbook with a different size).
function loadCachedVote(committeeId, delegateCount) {
  try {
    const raw = sessionStorage.getItem(voteStorageKey(committeeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const total = (parsed.groups?.[0]?.seats ?? 0) + (parsed.groups?.[1]?.seats ?? 0);
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

  // No committee means there's nothing to vote on - a delegate count of 0
  // would render an empty chart, so send the chair back to load a conference.
  useEffect(() => {
    if (!committee) navigate("/home");
  }, [committee, navigate]);

  const [motionText, setMotionText] = useState(cachedVote?.motionText ?? "");
  const [groups, setGroups] = useState(cachedVote?.groups ?? buildInitialGroups(delegateCount));
  const [motionLog, setMotionLog] = useState(cachedVote?.motionLog ?? []);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!committee) return;
    try {
      sessionStorage.setItem(voteStorageKey(committee.id), JSON.stringify({ motionText, groups, motionLog }));
    } catch {
      // storage unavailable (private browsing, quota) - falls back to in-memory-only
    }
  }, [committee, motionText, groups, motionLog]);

  // For/Against always sum to the committee's delegate count - each vote is
  // a delegate moving from one bloc to the other, not an independent tally.
  const adjustVotes = useCallback((index, delta) => {
    setGroups((prev) => {
      const otherIndex = index === 0 ? 1 : 0;
      const moved = delta > 0 ? Math.min(delta, prev[otherIndex].seats) : Math.max(delta, -prev[index].seats);
      if (moved === 0) return prev;
      return prev.map((group, i) => {
        if (i === index) return { ...group, seats: group.seats + moved };
        if (i === otherIndex) return { ...group, seats: group.seats - moved };
        return group;
      });
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      // Don't hijack these keys while the user is typing the motion text.
      const tag = event.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (event.key === "1") {
        setSelectedIndex(0);
      } else if (event.key === "2") {
        setSelectedIndex(1);
      } else if (event.key === "+" || event.key === "=") {
        adjustVotes(selectedIndex, 1);
      } else if (event.key === "-" || event.key === "_") {
        adjustVotes(selectedIndex, -1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, adjustVotes]);

  if (!committee) return null;

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

            <MotionInput
              value={motionText}
              onChange={setMotionText}
              placeholder="Enter the motion up for a vote…"
              rows={8}
              className="mt-4"
              delegations={delegations}
              onSubmit={(meta) => setMotionLog((prev) => [meta, ...prev])}
            />

            <MotionLog entries={motionLog} />
          </div>

          <div className="border border-white/10 bg-[#121212] p-6">
            <SeatChart
              title="Voting"
              subtitle="The motion (placeholder)"
              groups={groups}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onIncrement={(index) => adjustVotes(index, 1)}
              onDecrement={(index) => adjustVotes(index, -1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
