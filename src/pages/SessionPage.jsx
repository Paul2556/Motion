import SessionBoard from "../components/SessionBoard";
import ConferenceService from "../services/ConferenceService";

export default function SessionPage() {

  const committee = ConferenceService.getActiveCommittee();

  const initialQueue = (committee?.delegates ?? []).map((delegate) => ({
    id: delegate.id,
    country: delegate.countryDisplay || delegate.country,
    countryCode: delegate.countryCode,
  }));

  // Scope the "Add speaker" autosuggestions to delegations actually in this
  // committee, not the full ISO country list - same reasoning as MotionInput's
  // `delegations` prop on MotionPage.
  const suggestions = (committee?.delegates ?? []).map((delegate) => ({
    name: delegate.countryDisplay || delegate.country,
    code: delegate.countryCode,
  }));

  const activeMotion = "Moderated Caucus — 72s / speaker";

  return (
    <div className="app-shell h-screen overflow-hidden bg-[#0d0d0d] text-white">
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <SessionBoard
          committeeLabel={committee?.committee ?? committee?.id ?? "No committee loaded"}
          initialQueue={initialQueue}
          activeMotion={activeMotion}
          suggestions={suggestions}
        />
      </div>
    </div>
  )
}
