// Shared by MotionPage.jsx and GeneralVotingPage.jsx so both pages tally
// votes with identical rules. Colors use the app's categorical palette
// (slot 1 blue, slot 3 yellow - see src/index.css / the dataviz skill's
// palette reference) rather than freehand hex picks.

// Absent delegates can't cast a For/Against vote, so they're always
// pre-seeded into Abstain (forced on regardless of the manual "allow
// abstentions" toggle - see toggleAbstainGroups) rather than left out of the
// total or lumped into Against.
export function buildInitialGroups(presentCount, absentCount) {
  const groups = [
    { name: "For", seats: 0, color: "var(--vote-for)" },
    { name: "Against", seats: presentCount, color: "var(--vote-against)" },
  ];
  if (absentCount > 0) groups.push({ name: "Abstain", seats: absentCount, forced: absentCount, color: "var(--vote-abstain)" });
  return groups;
}

// Groups always sum to the same total, since a vote moves a delegate between
// blocs rather than tallying independently. Against is the shared bucket both
// For and Abstain exchange with, never directly with each other. A stale
// selection (Abstain after the group was folded away) is a no-op, and an
// absent delegate's forced abstention never moves.
export function adjustVoteGroups(groups, index, delta) {
  if (!groups[index]) return groups;
  const partner = index === 1 ? 0 : 1;
  const movable = groups[index].seats - (groups[index].forced ?? 0);
  const moved = delta > 0 ? Math.min(delta, groups[partner].seats) : Math.max(delta, -movable);
  if (moved === 0) return groups;
  return groups.map((group, i) => {
    if (i === index) return { ...group, seats: group.seats + moved };
    if (i === partner) return { ...group, seats: group.seats - moved };
    return group;
  });
}

// Toggling off folds abstentions back into Against so the total never
// changes. Only safe when no absent-forced abstentions exist, which is why
// callers disable the toggle whenever absentCount > 0.
export function toggleAbstainGroups(groups) {
  if (groups.length > 2) {
    return [groups[0], { ...groups[1], seats: groups[1].seats + groups[2].seats }];
  }
  return [...groups, { name: "Abstain", seats: 0, color: "var(--vote-abstain)" }];
}

// A saved tally is only reused for the same roster and the same attendance:
// once roll call changes who is absent, the forced abstentions are wrong.
const isBloc = (group) => Boolean(group) && Number.isInteger(group.seats) && group.seats >= 0;

export function isCachedVoteUsable(cached, delegateCount, absentCount) {
  if (!cached || cached.absentCount !== absentCount) return false;
  const { groups } = cached;
  if (!Array.isArray(groups) || groups.length < 2 || groups.length > 3 || !groups.every(isBloc)) return false;
  return groups.reduce((sum, group) => sum + group.seats, 0) === delegateCount;
}

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isOptionalText = (value) => value == null || typeof value === "string";
const isOptionalNumber = (value) => value == null || Number.isFinite(value);

// A logged motion is rendered field by field, so one wrong-typed field would
// crash the page; such entries are dropped rather than shown.
function isLoggedMotion(entry) {
  return (
    isPlainObject(entry) &&
    ["motion", "delegation", "topic"].every((field) => isOptionalText(entry[field])) &&
    ["totalTime", "speakingTime", "secondCount"].every((field) => isOptionalNumber(entry[field]))
  );
}

// The motion log and draft belong to the committee, not the tally, so they
// come back even when attendance has changed and only the tally is stale.
// `groups` is null whenever the caller should start a fresh tally.
export function restoreMotionWork(cached, delegateCount, absentCount) {
  const saved = isPlainObject(cached) ? cached : {};
  return {
    motionText: typeof saved.motionText === "string" ? saved.motionText : "",
    motionLog: Array.isArray(saved.motionLog) ? saved.motionLog.filter(isLoggedMotion) : [],
    groups: isCachedVoteUsable(saved, delegateCount, absentCount) ? saved.groups : null,
    votingMotionId: typeof saved.votingMotionId === "string" ? saved.votingMotionId : null,
  };
}
