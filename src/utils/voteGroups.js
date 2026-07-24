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
  if (absentCount > 0) groups.push({ name: "Abstain", seats: absentCount, color: "var(--vote-abstain)" });
  return groups;
}

// Groups always sum to the same total - each vote is a delegate moving from
// one bloc to another, not an independent tally. Against (index 1) is the
// shared default bucket both For and Abstain exchange with - a delegate
// moves For<->Against or Abstain<->Against, never directly between For and
// Abstain.
export function adjustVoteGroups(groups, index, delta) {
  const partner = index === 1 ? 0 : 1;
  const moved = delta > 0 ? Math.min(delta, groups[partner].seats) : Math.max(delta, -groups[index].seats);
  if (moved === 0) return groups;
  return groups.map((group, i) => {
    if (i === index) return { ...group, seats: group.seats + moved };
    if (i === partner) return { ...group, seats: group.seats - moved };
    return group;
  });
}

// Toggling on appends a fresh Abstain bucket; toggling off folds any
// existing abstentions back into Against so the total never changes. Only
// meant to be called when there are no absent-forced abstentions to protect
// (see MotionPage.jsx/GeneralVotingPage.jsx - the toggle is disabled
// whenever absentCount > 0).
export function toggleAbstainGroups(groups) {
  if (groups.length > 2) {
    return [groups[0], { ...groups[1], seats: groups[1].seats + groups[2].seats }];
  }
  return [...groups, { name: "Abstain", seats: 0, color: "var(--vote-abstain)" }];
}
