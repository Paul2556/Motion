// Resolution-debate speaker rotation (ThaiMUN RoP Rule 27): the written RoP
// specifies Against -> To -> For, but real conference practice (confirmed
// benchmark - see ConferenceService.js's default) simplifies this to
// Against -> For, dropping "To" speakers entirely. Both are supported since
// chairs differ on which they actually run.
export const ROTATION_SEQUENCES = {
  "2-part": ["Against", "For"],
  "3-part": ["Against", "To", "For"],
};

export function positionAt(type, index) {
  const sequence = ROTATION_SEQUENCES[type] ?? ROTATION_SEQUENCES["2-part"];
  return sequence[index % sequence.length];
}
