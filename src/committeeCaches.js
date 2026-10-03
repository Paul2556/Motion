// Per-committee dais state kept in sessionStorage, keyed by sheet id. A newly
// loaded workbook can reuse a sheet id ("UNSC"), so ConferenceService clears
// all of these whenever it switches conferences.
const PREFIXES = ["motion-vote-", "general-vote-", "motion-speakers-"];

export const motionVoteKey = (committeeId) => `motion-vote-${committeeId}`;
export const generalVoteKey = (committeeId) => `general-vote-${committeeId}`;
export const speakersKey = (committeeId) => `motion-speakers-${committeeId}`;

export function clearCommitteeCaches() {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index));
    for (const key of keys) {
      if (PREFIXES.some((prefix) => key?.startsWith(prefix))) sessionStorage.removeItem(key);
    }
  } catch {
    // storage unavailable - nothing was cached
  }
}
