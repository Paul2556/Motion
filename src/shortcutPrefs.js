import { findAction } from "./shortcuts";

// Remap overrides, same localStorage-backed get/set shape as appTheme.js -
// one JSON blob of { [actionId]: "event.code-based key string" }, so a
// single storage read covers every remapped action instead of one key per
// action.
const OVERRIDES_KEY = "app-shortcut-overrides";

function readOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Plain pub/sub so this module has no idea account sync exists, avoiding a
// circular import with prefsSync.js, which already imports this file.
const changeListeners = new Set();

export function onShortcutsChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

function writeOverrides(overrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // storage unavailable (private browsing, quota) - remap just won't persist
  }
  changeListeners.forEach((callback) => callback(overrides));
}

// Full blob, not one action - used by prefsSync.js to push a signed-in
// user's complete remap set as-is.
export function getAllShortcutOverrides() {
  return readOverrides();
}

// Wholesale replace, same write path as writeOverrides - used by
// prefsSync.js to adopt a signed-in user's server copy.
export function replaceOverrides(overrides) {
  writeOverrides(overrides);
}

// Clears every remap at once (vs. clearShortcutOverride's one-at-a-time) -
// used by prefsSync.js on sign-out so the next person at a shared device
// doesn't inherit whoever was last signed in.
export function resetAllShortcuts() {
  writeOverrides({});
}

export function getShortcutOverride(actionId) {
  return readOverrides()[actionId] ?? null;
}

// Falls back to the action's own defaultKey when nothing's been remapped,
// or null if actionId doesn't match any known action.
export function resolveKey(actionId) {
  const override = getShortcutOverride(actionId);
  if (override) return override;
  return findAction(actionId)?.defaultKey ?? null;
}

export function setShortcutOverride(actionId, key) {
  const overrides = readOverrides();
  overrides[actionId] = key;
  writeOverrides(overrides);
}

export function clearShortcutOverride(actionId) {
  const overrides = readOverrides();
  delete overrides[actionId];
  writeOverrides(overrides);
}

// Fixed labels only for codes that don't reduce to a single trailing
// letter/digit, so remapping to any letter or number still shows a clean
// single character rather than raw "KeyT".
const CODE_DISPLAY = {
  Enter: "Enter", Space: "Space", Backspace: "Backspace", Escape: "Esc",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Slash: "?", Equal: "+", Minus: "-",
};

function codeToDisplay(code) {
  if (CODE_DISPLAY[code]) return CODE_DISPLAY[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

// Turns a resolved key id (default or remapped) into what the legend/
// Settings list should actually show - has to work for *any* key a user
// remaps to, not just the predefined defaults, so it parses the id rather
// than looking up a fixed `display` string.
export function keyIdToDisplay(keyId) {
  if (!keyId) return "-";
  const parts = keyId.split("+");
  const code = parts.pop();
  const modLabels = parts.map((part) => (part === "Mod" ? "⌘/Ctrl" : part));
  return [...modLabels, codeToDisplay(code)].join("+");
}
