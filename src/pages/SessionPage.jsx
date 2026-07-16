import SessionBoard from "../components/SessionBoard";
import ConferenceService from "../services/ConferenceService";
import { countries, historicalCountries } from "../constants";

const COUNTRY_BY_CODE = new Map([...countries, ...historicalCountries].map((c) => [c.code, c]));

export default function SessionPage() {

  const committee = ConferenceService.getActiveCommittee();

  const initialQueue = (committee?.delegates ?? []).map((delegate) => ({
    id: delegate.id,
    country: delegate.countryDisplay || delegate.country,
    countryCode: delegate.countryCode,
  }));

  // Scope the "Add speaker" autosuggestions to delegations actually in this
  // committee, not the full ISO country list - same reasoning as MotionInput's
  // `delegations` prop on MotionPage. Also attach each delegation's known
  // aliases (e.g. "PRC" for China) so typing one still surfaces the delegate.
  const suggestions = (committee?.delegates ?? []).map((delegate) => ({
    name: delegate.countryDisplay || delegate.country,
    code: delegate.countryCode,
    alias: (delegate.countryCode && COUNTRY_BY_CODE.get(delegate.countryCode)?.alias) || [],
  }));

  // The nav pill/badge just needs the motion type ("Moderated Caucus"), not
  // the full formatted sentence (that's what MotionPage's voting panel shows).
  const activeMotion = ConferenceService.getActiveMotion()?.motion ?? "No motion active";

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
