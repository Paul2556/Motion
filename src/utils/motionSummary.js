import { formatDuration } from "./duration";

// Each clause is included only when that field was actually captured, since
// not every motion has a topic or speaking time. Shared so MotionPage and
// SessionPage display the same logged-motion shape.
export function formatMotionSummary(entry) {
  if (!entry) return "";
  const parts = [entry.motion ?? "Motion"];
  if (entry.totalTime != null) parts.push(`for ${formatDuration(entry.totalTime)}`);
  if (entry.speakingTime != null) parts.push(`with ${formatDuration(entry.speakingTime)} speaking time`);
  if (entry.topic) parts.push(`for the purpose of ${entry.topic}`);
  return parts.join(" ");
}
