import { MOTIONS } from "./constants";
import { randomId } from "./utils/randomId";
import { local } from "./utils/storage";

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
  "Adjourn Debate": "adjourn-debate",
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

// Shared so every consumer agrees on which string represents a motion: the
// shortest phrasing, falling back to the verbose `text` when no alias exists.
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

// Saved lists come from localStorage or an account's Firestore doc, so
// anything unusable is dropped here rather than crashing a page that maps it.
function toMotion(motion) {
  if (!motion || typeof motion !== "object") return null;
  if (typeof motion.id !== "string" || typeof motion.text !== "string" || !motion.text.trim()) return null;
  if (motion.alias === undefined) return motion;
  return { ...motion, alias: Array.isArray(motion.alias) ? motion.alias.filter((alias) => typeof alias === "string") : [] };
}

function sanitizeMotions(list) {
  return Array.isArray(list) ? list.map(toMotion).filter(Boolean) : null;
}

export function getMotions() {
  const saved = local.getJSON(STORAGE_KEY);
  return sanitizeMotions(saved) ?? seedMotions();
}

// Plain pub/sub so this module has no idea account sync exists, avoiding a
// circular import with prefsSync.js, which already imports this file.
const changeListeners = new Set();

export function onMotionsChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

function notifyChange() {
  const motions = getMotions();
  changeListeners.forEach((callback) => callback(motions));
}

// A failed write (private browsing, quota) just means edits won't persist.
function saveMotions(list) {
  local.setJSON(STORAGE_KEY, list);
  notifyChange();
}

// Wholesale replace, same write path as saveMotions - used by prefsSync.js
// to adopt a signed-in user's server copy. Not a list at all is ignored.
export function replaceMotions(list) {
  const motions = sanitizeMotions(list);
  if (motions) saveMotions(motions);
}

export function addMotion({ text, alias = [], topic = false, durationField = null }) {
  const motion = { id: randomId(), text, alias, topic, durationField };
  saveMotions([...getMotions(), motion]);
  return motion;
}

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
  local.remove(STORAGE_KEY);
  notifyChange();
}
