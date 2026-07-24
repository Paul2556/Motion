// Default dais keyboard shortcuts (spec: Keyboard Dais Controls v0.1). Keys
// are `event.code`-based (physical key position, e.g. "KeyP", "Digit1"),
// not `event.key` - layout-independent, and the only way to unambiguously
// tell "P" from "Shift+P" apart (event.key alone can't, since Shift changes
// the character itself for letters). `display` is purely presentational,
// shown in the legend/Settings remap list - never used for matching.
//
// Scoped per-view, not globally unique: the same code can mean different
// things in different scopes, since only one view is ever active at once.
// `global` is merged into whichever view-scope is active. `voting` is a
// fixed override merged in *instead of* everything else while a vote is
// open (see useDaisShortcuts.js) - it reuses the existing select-bloc-then-
// adjust voting UX already shipped in MotionPage.jsx, not a new "cast one
// vote per keypress" behavior.
//
// `Y` (cycle yield type) from the spec is deliberately not included - the
// spec itself hedges it "(if applicable)", and there's no yield-type concept
// anywhere in the app to bind it to yet.
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

// Voting is a fixed contextual override (spec: "cannot be remapped away"),
// so it's excluded from the flat list Settings renders - it's still
// individually remappable in principle via SHORTCUT_SCOPES.voting, but
// isn't exposed in the general remap UI to avoid implying it can be
// disabled/reordered relative to the other scopes.
export const REMAPPABLE_SCOPES = ["global", "speakerList", "motions", "rollCall"];

export function findAction(id) {
  for (const scope of Object.values(SHORTCUT_SCOPES)) {
    const found = scope.find((action) => action.id === id);
    if (found) return found;
  }
  return null;
}
