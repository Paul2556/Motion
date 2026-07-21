// Durations are stored as minutes (a float, so a sub-minute value like 12 seconds is 0.2) -
// see MotionInput.jsx's matchedUnit. Formats that back into whatever unit reads naturally,
// rather than ever showing something like "0.2 min".
export function formatDuration(minutes) {
  if (minutes == null) return null;

  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  if (totalSeconds % 60 === 0) return `${totalSeconds / 60} min`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}
