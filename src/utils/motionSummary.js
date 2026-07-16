// "{motion type} for {total time} with {speaking time} speaking time for the
// purpose of {topic}" - each clause is only included when that field was
// actually captured, since not every motion type has a topic/speaking time
// (e.g. an unmoderated caucus has no topic). Shared by MotionPage (the
// voting panel's subtitle) and SessionPage (the /session timer's motion
// badge), since both need to display the same logged-motion shape.
export function formatMotionSummary(entry) {
  if (!entry) return "";
  const parts = [entry.motion ?? "Motion"];
  if (entry.totalTime != null) parts.push(`for ${entry.totalTime} minutes`);
  if (entry.speakingTime != null) parts.push(`with ${entry.speakingTime} minutes speaking time`);
  if (entry.topic) parts.push(`for the purpose of ${entry.topic}`);
  return parts.join(" ");
}
