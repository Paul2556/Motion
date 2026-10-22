// Durations are stored as minutes (a float, so a sub-minute value like 12 seconds is 0.2) -
// see motionParser.js's unitMinutes. Formats that back into whatever unit reads naturally,
// rather than ever showing something like "0.2 min".
export function formatDuration(minutes) {
  if (minutes == null) return null;

  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  if (totalSeconds % 60 === 0) return `${totalSeconds / 60} min`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

// Whole seconds for the timer, or null when the time is missing or rounds
// below a second (a 0-second timer can't run).
export function toWholeSeconds(minutes) {
  if (minutes == null) return null;
  const seconds = Math.round(minutes * 60);
  return seconds >= 1 ? seconds : null;
}

// A typed amount from a form field, as minutes. Blank, zero, negative, and
// sub-second amounts all mean no duration, matching the natural-language
// parser, which ignores zero-length durations.
export function durationToMinutes(amount, unit) {
  if (String(amount).trim() === "") return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  const minutes = unit === "sec" ? value / 60 : value;
  return toWholeSeconds(minutes) == null ? null : minutes;
}
