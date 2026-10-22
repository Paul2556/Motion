// Kept out of SeatChart's SVG so callers can place the status in normal
// document flow: polar-coordinate label placement that never clipped seats or
// the viewBox across every committee size proved unworkable.
export function getVoteStatusLabel(groups) {
  const totalSeats = groups.reduce((sum, group) => sum + group.seats, 0);
  if (totalSeats === 0) return null;

  const forSeats = groups[0]?.seats ?? 0;
  if (forSeats === totalSeats) return "Full House";

  // "Two-thirds majority" means at least two-thirds, so 6 of 9 passes.
  const twoThirdsIndex = Math.ceil((totalSeats * 2) / 3);
  if (forSeats >= twoThirdsIndex) return "Super Majority";

  const majorityIndex = Math.floor(totalSeats / 2) + 1;
  if (forSeats >= majorityIndex) return "Simple Majority";

  return null;
}
