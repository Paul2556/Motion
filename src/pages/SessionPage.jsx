import { useLocation } from "react-router-dom";
import SessionBoard from "../components/SessionBoard";
import NoCommitteeModal from "../components/NoCommitteeModal";
import ConferenceService from "../services/ConferenceService";
import { countryAliases, initialSpeakersQueue, shortCountryName } from "../utils/speakersQueue";

export default function SessionPage() {

  const committee = ConferenceService.getActiveCommittee();
  const location = useLocation();

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

  // One-time seed from MotionPage - router state, not persisted, so a later
  // refresh of /session doesn't keep re-seeding over whatever the chair has
  // done with the queue since.
  const initialQueue = initialSpeakersQueue(committee.delegates, location.state ?? {});

  return (
    <div className="app-shell h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <SessionBoard
          committeeLabel={committee?.committee ?? committee?.id ?? "No committee loaded"}
          activeMotion={activeMotion}
          speechLength={speechLength}
          suggestions={suggestions}
          initialQueue={initialQueue}
        />
      </div>
    </div>
  )
}
