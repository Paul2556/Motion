export function getDelegateState(delegate) {
  if (!delegate.present) return "absent";
  return delegate.voting ? "voting" : "present";
}

// The roll call undo entries for moving `delegates` to `nextState`, leaving
// out anyone already there, so a no-op click can't overwrite the undo slot.
export function attendanceChanges(delegates, nextState) {
  return delegates
    .filter((delegate) => getDelegateState(delegate) !== nextState)
    .map((delegate) => ({ id: delegate.id, previousState: getDelegateState(delegate) }));
}

// Nobody marked present means the chair isn't using roll call, so the whole
// roster counts (speakers' list, votes, Stats) rather than nobody.
export function isRollCallTaken(delegates) {
  return delegates.some((delegate) => delegate.present);
}

export function attendanceCounts(delegates) {
  const present = isRollCallTaken(delegates) ? delegates.filter((delegate) => delegate.present).length : delegates.length;
  return { present, absent: delegates.length - present };
}
