import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SessionBoard from "../components/SessionBoard";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";
import { countryAliases, initialSpeakersQueue, restoreSavedSession, shortCountryName } from "../utils/speakersQueue";

function sessionStorageKey(committeeId) {
  return `motion-speakers-${committeeId}`;
}

function loadSavedSession(committee) {
  try {
    return restoreSavedSession(JSON.parse(sessionStorage.getItem(sessionStorageKey(committee.id))), committee.delegates);
  } catch {
    return restoreSavedSession(null, committee.delegates);
  }
}

function saveSession(committeeId, session) {
  try {
    sessionStorage.setItem(sessionStorageKey(committeeId), JSON.stringify(session));
  } catch {
    // storage unavailable (private browsing, quota) - the queue just won't survive a reload
  }
}

export default function SessionPage() {

  const committee = ConferenceService.getActiveCommittee();
  const location = useLocation();
  const navigate = useNavigate();
  const seed = location.state?.seedQueue || location.state?.seedProposer ? location.state : null;

  // Router state survives a refresh, so the one-time seed is cleared once
  // used; after that the saved queue is what comes back.
  useEffect(() => {
    if (seed) navigate(location.pathname, { replace: true, state: null });
  }, [seed, navigate, location.pathname]);

  // Same guard as RollCallPage/MotionPage/StatsPage - "Resume Session" on the home
  // screen links straight here regardless of whether a conference is loaded, so
  // this needs its own check rather than rendering SessionBoard against an empty
  // committee.
  if (!committee) return <NoCommitteeModal />;

  // Suggestions are scoped to this committee's delegations, with aliases
  // attached so "PRC" still finds China.
  const suggestions = (committee?.delegates ?? []).map((delegate) => ({
    id: delegate.id,
    name: shortCountryName(delegate),
    code: delegate.countryCode,
    alias: countryAliases(delegate),
  }));

  // The nav pill/badge just needs the motion type ("Moderated Caucus"), not
  // the full formatted sentence (that's what MotionPage's voting panel shows).
  const motion = ConferenceService.getActiveMotion();
  const activeMotion = motion?.motion ?? "No motion active";

  // A passed motion's speaking time drives the timer, falling back to its
  // total time and then SessionBoard's default. Rounded because a
  // seconds-derived value can arrive as 19.999999999998.
  const speechLength = motion?.speakingTime != null
    ? Math.round(motion.speakingTime * 60)
    : motion?.totalTime != null
      ? Math.round(motion.totalTime * 60)
      : undefined;

  // A fresh seed from MotionPage (a new speakers' list or a passed motion's
  // mover) replaces the saved queue; otherwise the saved one comes back, so
  // stepping over to roll call or voting doesn't lose the list.
  const saved = seed ? null : loadSavedSession(committee);
  const initialQueue = seed ? initialSpeakersQueue(committee.delegates, seed) : saved.queue;
  const initialHistory = saved?.history ?? [];

  return (
    <div className="app-shell h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <SessionBoard
          committeeLabel={committee?.committee ?? committee?.id ?? "No committee loaded"}
          activeMotion={activeMotion}
          speechLength={speechLength}
          suggestions={suggestions}
          initialQueue={initialQueue}
          initialHistory={initialHistory}
          onSessionChange={(session) => saveSession(committee.id, session)}
        />
      </div>
    </div>
  )
}
