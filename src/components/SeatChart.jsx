import { Plus, Minus } from "lucide-react";

// Parliamentary "hemicycle" seat chart: circles arranged across concentric
// semicircular rows, filled in angular order (left -> right) by bloc, with a
// dashed threshold line marking the majority seat and a legend below.
//
// `groups` is an ordered array of { name, seats, color }. Color is a prop,
// not auto-generated, so callers can match a specific bloc's real identity
// color - but when wiring this up for a new chart, default new groups to the
// categorical palette in fixed slot order (see src/index.css's --series-*
// custom properties) rather than picking colors freehand.
function computeSeatPositions(totalSeats, { seatRadius, rowGap, innerRadius }) {
  if (totalSeats <= 0) return { seats: [], rows: [], seatRadius, outerRadius: innerRadius };

  let numRows = 1;
  let rows = [];

  // Grow the row count until every row's seats fit without the circles
  // overlapping (chord spacing between adjacent seat centers >= seat
  // diameter), redistributing seats per row proportional to that row's
  // radius (circumference grows with radius, so outer rows hold more seats).
  for (;;) {
    rows = Array.from({ length: numRows }, (_, r) => ({
      radius: innerRadius + r * rowGap,
    }));

    const totalWeight = rows.reduce((sum, row) => sum + row.radius, 0);
    let assigned = 0;

    rows.forEach((row, i) => {
      const isLast = i === rows.length - 1;
      const share = isLast
        ? totalSeats - assigned
        : Math.round((row.radius / totalWeight) * totalSeats);
      row.seats = Math.max(1, share);
      assigned += row.seats;
    });

    const overcrowded = rows.some((row) => {
      if (row.seats <= 1) return false;
      const angleStep = Math.PI / (row.seats - 1);
      const chordSpacing = 2 * row.radius * Math.sin(angleStep / 2);
      return chordSpacing < seatRadius * 2.05;
    });

    if (!overcrowded || numRows > 8) break;
    numRows++;
  }

  // Every row spans the full 180 degrees on its own (just with a different
  // seat count/radius), so each row keeps its own angle-sorted seat list -
  // needed later to find where the majority boundary actually falls *within
  // that row*, rather than assuming one global angle lines up with every
  // row's (different) seat spacing.
  rows.forEach((row) => {
    const n = row.seats;
    row.rowSeats = [];

    for (let i = 0; i < n; i++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (i / (n - 1)) * Math.PI;
      const seat = { x: Math.cos(angle) * row.radius, y: -Math.sin(angle) * row.radius, angle, radius: row.radius };
      row.rowSeats.push(seat);
    }
  });

  const seats = rows.flatMap((row) => row.rowSeats);

  // Angular order (left -> right) is what determines fill order by bloc,
  // independent of which row a seat happens to land in.
  seats.sort((a, b) => b.angle - a.angle);

  return { seats, rows, seatRadius, outerRadius: rows[rows.length - 1]?.radius ?? innerRadius };
}

// Where does `targetAngle` fall within this row's own seats? Returns the
// midpoint angle between whichever pair of the row's seats straddle it, so a
// curve through these points threads the actual gap at every row instead of
// cutting across seats whose row has a different angular spacing.
function rowGapAngle(rowSeats, targetAngle) {
  const sorted = [...rowSeats].sort((a, b) => b.angle - a.angle);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].angle >= targetAngle && targetAngle >= sorted[i + 1].angle) {
      return (sorted[i].angle + sorted[i + 1].angle) / 2;
    }
  }

  return targetAngle;
}

// A smooth curve through an ordered list of points, using the midpoint of
// each consecutive pair as the on-curve anchor and the point itself as the
// quadratic control - a standard "smooth freehand line through N points"
// construction, so multi-row boundaries don't kink at each row.
function smoothPathThroughPoints(points) {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const isLast = i === points.length - 2;

    if (isLast) {
      d += ` Q ${p0.x} ${p0.y} ${p1.x} ${p1.y}`;
    } else {
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
    }
  }

  return d;
}

export default function SeatChart({
  title,
  subtitle,
  groups,
  seatRadius = 15,
  rowGap = 34,
  innerRadius = 60,
  selectedIndex = null,
  onSelect,
  onIncrement,
  onDecrement,
}) {
  const totalSeats = groups.reduce((sum, group) => sum + group.seats, 0);

  const { seats, rows, outerRadius } = computeSeatPositions(totalSeats, {
    seatRadius,
    rowGap,
    innerRadius,
  });

  // Assign each seat to a bloc by consuming `groups` in order along the
  // angle-sorted seat list - matches the reference layout (one bloc occupies
  // a contiguous wedge, not interleaved row-by-row).
  const coloredSeats = [];
  let cursor = 0;
  for (const group of groups) {
    for (let i = 0; i < group.seats && cursor < seats.length; i++, cursor++) {
      coloredSeats.push({ ...seats[cursor], color: group.color, name: group.name });
    }
  }

  const majorityIndex = Math.floor(totalSeats / 2) + 1; // seats needed to win
  // Line sits just before the majorityIndex-th seat, so having that many
  // seats filled means the winning seat itself has crossed onto the pass
  // side - majority is reached AT that seat, not one seat after it.
  const before = seats[majorityIndex - 2];
  const after = seats[majorityIndex - 1];
  const majorityAngle = before && after ? (before.angle + after.angle) / 2 : null;

  const sidePadding = seatRadius + 4;
  // Seats extend `seatRadius` beyond `outerRadius`, and the majority label
  // sits a further ~14px + its own text height beyond that - reserve enough
  // top room for both, or the outer row/label clip the viewBox edge. Seats in
  // the innermost row sit almost exactly on the baseline (angle near 0/pi),
  // so they need their own `seatRadius` of room below centerY too.
  const topPadding = seatRadius + 34;
  const bottomPadding = seatRadius + 4;
  const width = (outerRadius + sidePadding) * 2;
  const height = outerRadius + topPadding + bottomPadding;
  const centerX = width / 2;
  const centerY = height - bottomPadding;

  const majorityLine = majorityAngle == null || rows.length === 0 ? null : (() => {
    // One point per row, at that row's own local gap angle nearest the
    // global boundary - this is what makes the line thread between seats
    // instead of cutting through whichever row's spacing doesn't match the
    // single global angle.
    const rowPoints = rows.map((row) => {
      const angle = rowGapAngle(row.rowSeats, majorityAngle);
      return {
        x: centerX + Math.cos(angle) * row.radius,
        y: centerY - Math.sin(angle) * row.radius,
      };
    });

    const innerPoint = {
      x: centerX + Math.cos(majorityAngle) * (innerRadius - seatRadius),
      y: centerY - Math.sin(majorityAngle) * (innerRadius - seatRadius),
    };
    const outerPoint = {
      x: centerX + Math.cos(majorityAngle) * (outerRadius + seatRadius),
      y: centerY - Math.sin(majorityAngle) * (outerRadius + seatRadius),
    };

    const points = [innerPoint, ...rowPoints, outerPoint];

    return {
      path: smoothPathThroughPoints(points),
      labelX: centerX + Math.cos(majorityAngle) * (outerRadius + seatRadius + 14),
      labelY: centerY - Math.sin(majorityAngle) * (outerRadius + seatRadius + 14),
    };
  })();

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`${totalSeats} seats: ${groups.map((g) => `${g.name} ${g.seats}`).join(", ")}`}
      >
        {majorityLine && (
          <>
            <path
              d={majorityLine.path}
              fill="none"
              stroke="#898781"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={majorityLine.labelX}
              y={majorityLine.labelY + 8}
              textAnchor="middle"
              className="fill-white/45"
              style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Simple Majority
            </text>
          </>
        )}

        {coloredSeats.map((seat, i) => (
          <circle
            key={i}
            cx={centerX + seat.x}
            cy={centerY + seat.y}
            r={seatRadius}
            fill={seat.color}
          />
        ))}
      </svg>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/40">
          <span>Vote</span>
          <span>Seats</span>
        </div>

        <div className="mt-2 divide-y divide-white/5">
          {groups.map((group, index) => {
            const isSelected = selectedIndex === index;

            return (
              <div
                key={group.name}
                onClick={() => onSelect?.(index)}
                className={`flex items-center justify-between py-2.5 px-2 -mx-2 transition ${
                  isSelected ? "bg-white/5" : ""
                } ${onSelect ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-sm text-white/80">{group.name}</span>
                  {onSelect && (
                    <span className="rounded-none border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-10 text-right text-sm text-white/50">{group.seats}</span>

                  {(onIncrement || onDecrement) && (
                    <div className="flex gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDecrement?.(index);
                        }}
                        aria-label={`Decrease ${group.name} votes`}
                        className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
                      >
                        <Minus size={12} />
                      </button>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onIncrement?.(index);
                        }}
                        aria-label={`Increase ${group.name} votes`}
                        className="border border-white/10 p-1 text-white/70 transition hover:bg-white/10"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
