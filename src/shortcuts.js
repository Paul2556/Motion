// Keyed on `event.code` so bindings are layout-independent and "P" is
// distinguishable from "Shift+P"; `display` is presentational only. Scoped
// per-view since only one view is active at a time, with `voting` merged in
// as a fixed override while a vote is open.
export const SHORTCUT_SCOPES = {
  global: [
    { id: "global.viewSpeakerList", label: "Switch to Speaker List", defaultKey: "Digit1", display: "1" },
    { id: "global.viewMotions", label: "Switch to Motions", defaultKey: "Digit2", display: "2" },
    { id: "global.viewRollCall", label: "Switch to Roll Call", defaultKey: "Digit3", display: "3" },
    { id: "global.viewGeneralVoting", label: "Switch to General Voting", defaultKey: "Digit4", display: "4" },
    { id: "global.undo", label: "Undo last action", defaultKey: "Mod+KeyZ", display: "⌘Z / Ctrl+Z" },
    { id: "global.legend", label: "Toggle shortcut legend", defaultKey: "Shift+Slash", display: "?" },
  ],
  speakerList: [
    { id: "speakerList.recognizeNext", label: "Recognize next speaker", defaultKey: "Enter", display: "Enter" },
    { id: "speakerList.toggleTimer", label: "Start/pause timer", defaultKey: "Space", display: "Space" },
    { id: "speakerList.resetTimer", label: "Reset timer", defaultKey: "KeyR", display: "R" },
    { id: "speakerList.removeSelected", label: "Remove selected delegate", defaultKey: "Backspace", display: "Backspace" },
    { id: "speakerList.addSpeaker", label: "Add delegate to queue", defaultKey: "KeyA", display: "A" },
    { id: "speakerList.moveUp", label: "Move selection up", defaultKey: "ArrowUp", display: "↑" },
    { id: "speakerList.moveDown", label: "Move selection down", defaultKey: "ArrowDown", display: "↓" },
  ],
  motions: [
    { id: "motions.newMotion", label: "Focus new motion text", defaultKey: "KeyM", display: "M" },
    { id: "motions.second", label: "Second selected motion", defaultKey: "KeyS", display: "S" },
    { id: "motions.openVote", label: "Open vote on selected motion", defaultKey: "KeyV", display: "V" },
    { id: "motions.moveUp", label: "Move selection up", defaultKey: "ArrowUp", display: "↑" },
    { id: "motions.moveDown", label: "Move selection down", defaultKey: "ArrowDown", display: "↓" },
    { id: "motions.confirm", label: "Open vote on selected motion", defaultKey: "Enter", display: "Enter" },
  ],
  rollCall: [
    { id: "rollCall.moveUp", label: "Move selection up", defaultKey: "ArrowUp", display: "↑" },
    { id: "rollCall.moveDown", label: "Move selection down", defaultKey: "ArrowDown", display: "↓" },
    { id: "rollCall.cycleNext", label: "Cycle status forward", defaultKey: "ArrowRight", display: "→" },
    { id: "rollCall.cyclePrev", label: "Cycle status back", defaultKey: "ArrowLeft", display: "←" },
    { id: "rollCall.setAbsent", label: "Set Absent", defaultKey: "Digit0", display: "0" },
    { id: "rollCall.setPresent", label: "Set Present", defaultKey: "KeyP", display: "P" },
    { id: "rollCall.setPresentVoting", label: "Set Present & Voting", defaultKey: "Shift+KeyP", display: "Shift+P" },
    { id: "rollCall.bulkPresent", label: "Set everyone Present", defaultKey: "Shift+KeyA", display: "Shift+A" },
    { id: "rollCall.confirmModal", label: "Confirm bulk-change prompt", defaultKey: "Enter", display: "Enter" },
    { id: "rollCall.cancelModal", label: "Cancel bulk-change prompt", defaultKey: "Escape", display: "Esc" },
  ],
  voting: [
    { id: "voting.selectFor", label: "Select For", defaultKey: "Digit1", display: "1" },
    { id: "voting.selectAgainst", label: "Select Against", defaultKey: "Digit2", display: "2" },
    { id: "voting.selectAbstain", label: "Select Abstain", defaultKey: "Digit3", display: "3" },
    { id: "voting.increment", label: "Add vote to selected bloc", defaultKey: "Equal", display: "+" },
    { id: "voting.decrement", label: "Remove vote from selected bloc", defaultKey: "Minus", display: "-" },
  ],
};

// Voting is a fixed override, so it's excluded from the list Settings renders
// to avoid implying it can be disabled or reordered against other scopes.
export const REMAPPABLE_SCOPES = ["global", "speakerList", "motions", "rollCall"];

export function findAction(id) {
  for (const scope of Object.values(SHORTCUT_SCOPES)) {
    const found = scope.find((action) => action.id === id);
    if (found) return found;
  }
  return null;
}
