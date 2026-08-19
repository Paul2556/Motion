import { Plus, Minus } from "lucide-react";

// Hemicycle seat chart: concentric rows filled left-to-right by bloc, with a dashed majority-threshold line.
// groups colors are explicit. Default new ones to the categorical palette in index.css, not ad hoc.
function computeSeatPositions(totalSeats, { seatRadius, rowGap, innerRadius }) {
  if (totalSeats <= 0) return { seats: [], rows: [], seatRadius, outerRadius: innerRadius };

  let numRows = 1;
  let rows = [];

  // Grows row count until seats fit without overlapping; outer rows hold more seats (bigger circumference).
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

    // 4.25 (not the bare non-overlap minimum) leaves real clearance, found empirically, so the line never grazes a seat.
    const overcrowded = rows.some((row) => {
      if (row.seats <= 1) return false;
      const angleStep = Math.PI / (row.seats - 1);
      const chordSpacing = 2 * row.radius * Math.sin(angleStep / 2);
      return chordSpacing < seatRadius * 4.25;
    });

    if (!overcrowded || numRows > 8) break;
    numRows++;
  }

  // Each row keeps its own seat list, needed later to count before/after seats per row.
  rows.forEach((row) => {
    const n = row.seats;
    row.rowSeats = [];
    row.angleStep = n === 1 ? Math.PI : Math.PI / (n - 1);

    for (let i = 0; i < n; i++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (i / (n - 1)) * Math.PI;
      const seat = { x: Math.cos(angle) * row.radius, y: -Math.sin(angle) * row.radius, angle, radius: row.radius, row };
      row.rowSeats.push(seat);
    }
  });

  // Rows with an odd seat count share a seat at the exact center angle, so
  // two different rows can land seats on top of each other. Spread each
  // colliding group apart (skip the 0/pi ends, where every radius meets at
  // y=0 anyway) using a slice of each seat's own row spacing.
  const angleGroups = new Map();
  for (const seat of rows.flatMap((row) => row.rowSeats)) {
    if (seat.angle < 1e-9 || Math.abs(seat.angle - Math.PI) < 1e-9) continue;
    const key = Math.round(seat.angle * 1e6);
    if (!angleGroups.has(key)) angleGroups.set(key, []);
    angleGroups.get(key).push(seat);
  }
  for (const group of angleGroups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.radius - b.radius);
    group.forEach((seat, k) => {
      seat.angle += seat.row.angleStep * 0.15 * (k - (group.length - 1) / 2);
      seat.x = Math.cos(seat.angle) * seat.radius;
      seat.y = -Math.sin(seat.angle) * seat.radius;
    });
  }

  const seats = rows.flatMap((row) => row.rowSeats);

  // Sorted left-to-right by angle. This order determines fill order by bloc.
  seats.sort((a, b) => b.angle - a.angle);

  return { seats, rows, seatRadius, outerRadius: rows[rows.length - 1]?.radius ?? innerRadius };
}

// Shortest distance from p to segment a-b, used to check a line segment clears every seat.
function pointToSegmentDistance(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
}

function segmentClearsSeats(a, b, seatPositions, seatRadius) {
  return seatPositions.every((s) => pointToSegmentDistance(s, a, b) >= seatRadius + 1);
}

// Does the quadratic corner through ctrl clear every seat by seatRadius, sampled densely.
function cornerClearsSeats(a, ctrl, b, seatPositions, seatRadius) {
  for (let s = 1; s < 10; s++) {
    const t = s / 10;
    const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t ** 2 * b.x;
    const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t ** 2 * b.y;
    for (const seat of seatPositions) {
      if (Math.hypot(x - seat.x, y - seat.y) < seatRadius + 1) return false;
    }
  }
  return true;
}

// Straight segments with each corner rounded off by a small, verified-safe fillet radius.
function roundedPathThroughPoints(points, seatPositions, seatRadius) {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
    let radius = Math.min(14, lenIn / 2, lenOut / 2);
    let approach;
    let depart;
    for (;;) {
      const tIn = radius / lenIn;
      const tOut = radius / lenOut;
      approach = { x: curr.x + (prev.x - curr.x) * tIn, y: curr.y + (prev.y - curr.y) * tIn };
      depart = { x: curr.x + (next.x - curr.x) * tOut, y: curr.y + (next.y - curr.y) * tOut };
      if (radius < 0.5 || cornerClearsSeats(approach, curr, depart, seatPositions, seatRadius)) break;
      radius *= 0.6;
    }
    d += ` L ${approach.x} ${approach.y} Q ${curr.x} ${curr.y} ${depart.x} ${depart.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
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

  // Fills blocs in angle order, one bloc per contiguous wedge, not interleaved row by row.
  const coloredSeats = [];
  let cursor = 0;
  for (const group of groups) {
    for (let i = 0; i < group.seats && cursor < seats.length; i++, cursor++) {
      coloredSeats.push({ ...seats[cursor], color: group.color, name: group.name });
    }
  }

  const majorityIndex = Math.floor(totalSeats / 2) + 1; // seats needed to win
  const twoThirdsIndex = Math.floor((totalSeats * 2) / 3) + 1; // seats needed for a supermajority

  const sidePadding = seatRadius + 4;
  const topPadding = seatRadius + 4;
  const bottomPadding = seatRadius + 4;
  const width = (outerRadius + sidePadding) * 2;
  const height = outerRadius + topPadding + bottomPadding;
  const centerX = width / 2;
  const centerY = height - bottomPadding;

  // Builds a dashed threshold line at the boundary before the given seat
  // index (1-based, e.g. majorityIndex/twoThirdsIndex) - shared by every
  // threshold line the chart can show, since the geometry (row gaps, seat
  // clearance) is identical, only the boundary position differs.
  function buildThresholdLine(thresholdIndex) {
    const trueBeforeSeats = new Set(seats.slice(0, thresholdIndex - 1));
    if (trueBeforeSeats.size === totalSeats || rows.length === 0 || seats.length < 2) return null;

    // A row entirely before or after the boundary still gets a gap past its outermost seat.
    const rowAngles = rows.map((row) => {
      const sorted = [...row.rowSeats].sort((a, b) => b.angle - a.angle);
      const beforeCount = sorted.filter((s) => trueBeforeSeats.has(s)).length;
      if (beforeCount === 0) return sorted[sorted.length - 1].angle - 0.3;
      if (beforeCount === sorted.length) return sorted[0].angle + 0.3;
      return (sorted[beforeCount - 1].angle + sorted[beforeCount].angle) / 2;
    });

    const rowPoints = rows.map((row, i) => ({
      x: centerX + Math.cos(rowAngles[i]) * row.radius,
      y: centerY - Math.sin(rowAngles[i]) * row.radius,
    }));

    // Reaches the actual center, nudged up 10px so the tip isn't flush with the baseline.
    const innerPoint = { x: centerX, y: centerY - 10 };
    const outerAngle = rowAngles[rowAngles.length - 1];
    const outerPoint = {
      x: centerX + Math.cos(outerAngle) * (outerRadius + seatRadius * 1.5),
      y: centerY - Math.sin(outerAngle) * (outerRadius + seatRadius * 1.5),
    };

    const rawPoints = [innerPoint, ...rowPoints, outerPoint];
    const seatPositions = seats.map((s) => ({ x: centerX + s.x, y: centerY + s.y }));

    // Rows with very different seat counts can have gaps far apart in angle, risking a graze.
    const points = [rawPoints[0]];
    for (let i = 0; i < rawPoints.length - 1; i++) {
      const a = rawPoints[i];
      const b = rawPoints[i + 1];
      if (segmentClearsSeats(a, b, seatPositions, seatRadius)) {
        points.push(b);
        continue;
      }
      // Nearest safe waypoint to the segment's midpoint, so the detour stays small rather than swinging wide.
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let detour = null;
      let bestDistSq = Infinity;
      for (let dx = -100; dx <= 100; dx += 8) {
        for (let dy = -100; dy <= 100; dy += 8) {
          const candidate = { x: midX + dx, y: midY + dy };
          const distSq = dx * dx + dy * dy;
          if (distSq >= bestDistSq) continue;
          if (segmentClearsSeats(a, candidate, seatPositions, seatRadius) && segmentClearsSeats(candidate, b, seatPositions, seatRadius)) {
            detour = candidate;
            bestDistSq = distSq;
          }
        }
      }
      if (detour) points.push(detour);
      points.push(b);
    }

    return {
      path: roundedPathThroughPoints(points, seatPositions, seatRadius),
    };
  }

  // The seats needed to win are counted in fill order (group[0] first), so a
  // vote "passes" a threshold once group[0]'s own seat count reaches it -
  // the leading bloc is always assumed to be at index 0 (see MotionPage's
  // "For" group). The two-thirds line only appears once actually reached,
  // so it reads as confirmation rather than a target shown from the start.
  const forSeats = groups[0]?.seats ?? 0;
  const passedSupermajority = totalSeats > 0 && forSeats >= twoThirdsIndex;
  const fullHouse = totalSeats > 0 && forSeats === totalSeats;

  // Once supermajority is reached, the simple-majority line is redundant -
  // it's already been passed too, so only the higher, more relevant
  // threshold stays visible.
  const majorityLine = passedSupermajority ? null : buildThresholdLine(majorityIndex);
  // Full house makes the supermajority line redundant too, same reasoning
  // as majorityLine above - there's no boundary left to point at once every
  // seat has already crossed it.
  const twoThirdsLine = passedSupermajority && !fullHouse ? buildThresholdLine(twoThirdsIndex) : null;

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-semibold text-[var(--app-text)]">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-[var(--app-text-muted)]">{subtitle}</p>}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`${totalSeats} seats: ${groups.map((g) => `${g.name} ${g.seats}`).join(", ")}`}
      >
        {majorityLine && (
          <path
            d={majorityLine.path}
            fill="none"
            stroke="#898781"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
        )}

        {twoThirdsLine && (
          <path
            d={twoThirdsLine.path}
            fill="none"
            stroke="#e5b73a"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
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

      <div className="mt-6 border-t border-[var(--app-border)] pt-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
          <span>Vote</span>
          <span>Seats</span>
        </div>

        <div className="mt-2 divide-y divide-[var(--app-border-faint)]">
          {groups.map((group, index) => {
            const isSelected = selectedIndex === index;

            return (
              <div
                key={group.name}
                onClick={() => onSelect?.(index)}
                className={`flex items-center justify-between py-2.5 px-2 -mx-2 transition ${
                  isSelected ? "bg-[var(--app-chip)]" : ""
                } ${onSelect ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-sm text-[var(--app-text-secondary)]">{group.name}</span>
                  {onSelect && (
                    <span className="rounded-none border border-[var(--app-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--app-text-muted)]">
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="w-10 text-right text-sm text-[var(--app-text-muted)]">{group.seats}</span>

                  {(onIncrement || onDecrement) && (
                    <div className="flex gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDecrement?.(index);
                        }}
                        aria-label={`Decrease ${group.name} votes`}
                        className="border border-[var(--app-border)] p-1 text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
                      >
                        <Minus size={12} />
                      </button>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onIncrement?.(index);
                        }}
                        aria-label={`Increase ${group.name} votes`}
                        className="border border-[var(--app-border)] p-1 text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
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
