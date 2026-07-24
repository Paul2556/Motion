import { MOTIONS } from "./constants";

// Same localStorage-backed override pattern as shortcutPrefs.js - one JSON
// blob holding the full effective motions list, re-read on every call rather
// than cached (App.jsx's routes are flat siblings, so /motion and /settings
// always unmount/remount each other - no cross-mount reactivity needed).
const STORAGE_KEY = "app-motion-presets";

// Hand-assigned so each built-in motion keeps a stable identity across edits
// (text/alias become editable, so they can't double as the key). Keyed by
// canonical label (alias[0] ?? text), not array position, so reordering
// MOTIONS in constants.js can't silently desync ids from motions.
const SEED_IDS = {
  "Moderated Caucus": "mod-caucus",
  "Unmoderated Caucus": "unmod-caucus",
  "Open the GSL": "open-gsl",
  "Close the GSL": "close-gsl",
  "Extend Speaking Time": "extend-speaking",
  "Extend the Mod Caucus": "extend-mod-caucus",
  "Introduce Draft Resolution": "intro-draft-resolution",
  "Introduce Amendment": "intro-amendment",
  "Move to Voting Procedure": "move-voting-procedure",
  "Suspend Meeting": "suspend-meeting",
  "Adjourn Meeting": "adjourn-meeting",
  // ThaiMUN RoP additions (see constants.js's MOTIONS comment).
  "Point of Order": "point-of-order",
  "Personal Privilege": "personal-privilege",
  "Appeal the Chair": "appeal-the-chair",
  "Suspend Debate": "suspend-debate",
  "Divide the House": "divide-the-house",
  "Reconsider the Vote": "reconsider-the-vote",
  "Closure of Debate": "closure-of-debate",
  "Change the Agenda": "change-the-agenda",
  "Table for Incompetence": "table-for-incompetence",
  "Extend the Speaker's List": "extend-speakers-list",
  "Extend Points of Information": "extend-poi",
  "Divide the Question": "divide-the-question",
  "Point of Information": "point-of-information",
  "Parliamentary Inquiry": "parliamentary-inquiry",
  "Clarification": "point-of-clarification",
  "Right to Reply": "right-to-reply",
  "Explanation of Vote": "explanation-of-vote",
};

// Shared by MotionInput.jsx (phrase building), MotionPage.jsx (precedence
// lookup), and MotionPresetManager.jsx (list display) so all three agree on
// which string represents a given motion - always the shortest/most direct
// phrasing (alias[0]), falling back to the verbose `text` when there's no
// alias at all.
export function canonicalLabel(motion) {
  return motion.alias?.[0] ?? motion.text;
}

// Safety net only - covers a future built-in added to constants.js without a
// matching SEED_IDS entry, so it still gets a usable (if uglier) id instead
// of undefined.
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}

function seedMotions() {
  return MOTIONS.map((motion) => ({
    ...motion,
    id: SEED_IDS[canonicalLabel(motion)] ?? slugify(motion.text),
  }));
}

export function getMotions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedMotions();
  } catch {
    return seedMotions();
  }
}

// Notified after every local write (add/update/delete/move/reset all funnel
// through here or resetMotions below) - src/services/prefsSync.js subscribes
// to push changes up to a signed-in user's account. Kept as a plain pub/sub
// here (rather than motionPresets.js importing prefsSync.js) so this module
// has no idea account sync even exists - avoids a circular import, since
// prefsSync.js already needs to import *this* file.
const changeListeners = new Set();

export function onMotionsChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

function notifyChange() {
  const motions = getMotions();
  changeListeners.forEach((callback) => callback(motions));
}

function saveMotions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private browsing, quota) - edits just won't persist
  }
  notifyChange();
}

// Wholesale replace, same write path as saveMotions - used by prefsSync.js
// to adopt a signed-in user's server copy.
export function replaceMotions(list) {
  saveMotions(list);
}

// `explicit` (MotionInput's internal requireExactWordCount guard, only ever
// set on the seed "Extend the Speaking Time") is deliberately never part of
// the accepted patch shape here - omitting it (rather than writing `false`)
// means updateMotion's merge below can't ever clobber it on an existing
// record.
export function addMotion({ text, alias = [], topic = false, durationField = null }) {
  const motion = { id: crypto.randomUUID(), text, alias, topic, durationField };
  saveMotions([...getMotions(), motion]);
  return motion;
}

// Plain merge patch - callers (the editor form) must never include an
// `explicit` key in patch, so any pre-existing `explicit: true` on a
// built-in survives edits untouched.
export function updateMotion(id, patch) {
  saveMotions(getMotions().map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export function deleteMotion(id) {
  saveMotions(getMotions().filter((m) => m.id !== id));
}

// Swaps a motion with its neighbor in the list - array order IS the
// precedence rank MotionPage.jsx sorts the motion log by (most disruptive
// first), so reordering here is how a chair re-tunes precedence without a
// separate numeric field. No-op at either end of the list.
export function moveMotion(id, direction) {
  const list = getMotions();
  const index = list.findIndex((m) => m.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= list.length) return;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  saveMotions(next);
}

// Reverts to defaults by clearing the override entirely, not by re-seeding -
// so a stale/corrupt saved list can't linger past a reset.
export function resetMotions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable - nothing to clear
  }
  notifyChange();
}
