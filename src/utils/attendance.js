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
