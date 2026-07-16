// Pure and standalone so callers can render the current vote status as
// plain text wherever fits their layout, rather than SeatChart trying to
// place it inside the SVG itself - polar-coordinate label placement that
// never clips seats or the viewBox edge across every committee size turned
// out to be a losing battle, and plain document flow doesn't have that problem.
export function getVoteStatusLabel(groups) {
  const totalSeats = groups.reduce((sum, group) => sum + group.seats, 0);
  if (totalSeats === 0) return null;

  const forSeats = groups[0]?.seats ?? 0;
  if (forSeats === totalSeats) return "Full House";

  const twoThirdsIndex = Math.floor((totalSeats * 2) / 3) + 1;
  if (forSeats >= twoThirdsIndex) return "Super Majority";

  const majorityIndex = Math.floor(totalSeats / 2) + 1;
  if (forSeats >= majorityIndex) return "Simple Majority";

  return null;
}
