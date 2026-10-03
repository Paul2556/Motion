import { countries, historicalCountries } from "../constants";

const COUNTRY_BY_CODE = new Map([...countries, ...historicalCountries].map((c) => [c.code, c]));

// The queue shows the short canonical name rather than placard text, since a
// long formal name wraps badly in its narrow card.
export function shortCountryName(delegate) {
  return COUNTRY_BY_CODE.get(delegate.countryCode)?.name ?? delegate.countryDisplay ?? delegate.country;
}

export function countryAliases(delegate) {
  return (delegate.countryCode && COUNTRY_BY_CODE.get(delegate.countryCode)?.alias) || [];
}

function toQueueEntry(delegate) {
  return { id: delegate.id, country: shortCountryName(delegate), countryCode: delegate.countryCode };
}

// MotionInput reports the mover as the words that matched, which may be an
// alias ("US", "Holland"), so every name the country goes by is checked.
function findMover(delegates, mover) {
  const wanted = mover.toLowerCase();
  return delegates.find((delegate) =>
    [shortCountryName(delegate), delegate.countryDisplay, delegate.country, ...countryAliases(delegate)]
      .some((name) => name?.toLowerCase() === wanted)
  );
}

// The one-time seed MotionPage hands /session: the whole speakers' list
// (seedQueue) or just a passed motion's mover (seedProposer). Absent
// delegates are left out once roll call has marked anyone present; before
// that, nobody is marked, so the full roster is the only sensible list.
export function initialSpeakersQueue(delegates, { seedQueue, seedProposer } = {}) {
  if (seedQueue) {
    const rollCallTaken = delegates.some((delegate) => delegate.present);
    return delegates
      .filter((delegate) => !rollCallTaken || delegate.present)
      .sort((a, b) => (a.countryDisplay || a.country).localeCompare(b.countryDisplay || b.country))
      .map(toQueueEntry);
  }
  const mover = seedProposer ? findMover(delegates, seedProposer) : null;
  return mover ? [toQueueEntry(mover)] : [];
}

// A saved speakers' list only keeps delegates still in this committee, so a
// reloaded workbook (fresh delegate ids) starts clean instead of showing
// yesterday's queue.
export function restoreSavedSession(saved, delegates) {
  const ids = new Set(delegates.map((delegate) => delegate.id));
  const keep = (list) => (Array.isArray(list) ? list.filter((entry) => ids.has(entry?.id)) : []);
  return { queue: keep(saved?.queue), history: keep(saved?.history) };
}
