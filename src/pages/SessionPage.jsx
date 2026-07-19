import SessionBoard from "../components/SessionBoard";
import ConferenceService from "../services/ConferenceService";
import { countries, historicalCountries } from "../constants";

const COUNTRY_BY_CODE = new Map([...countries, ...historicalCountries].map((c) => [c.code, c]));

export default function SessionPage() {

  const committee = ConferenceService.getActiveCommittee();

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
  const motion = ConferenceService.getActiveMotion();
  const activeMotion = motion?.motion ?? "No motion active";

  // A passed motion's speaking time (minutes, from MotionInput's parsing)
  // becomes the per-speaker timer length here - falls back to SessionBoard's
  // own default when no motion set one (e.g. no motion voted on yet).
  const speechLength = motion?.speakingTime != null ? motion.speakingTime * 60 : undefined;

  return (
    <div className="app-shell h-screen overflow-hidden bg-[#0d0d0d] text-white">
      <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <SessionBoard
          committeeLabel={committee?.committee ?? committee?.id ?? "No committee loaded"}
          activeMotion={activeMotion}
          speechLength={speechLength}
          suggestions={suggestions}
        />
      </div>
    </div>
  )
}
