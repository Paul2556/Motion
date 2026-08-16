// A caller can set X-Forwarded-For to anything, but Vercel's edge appends the
// real client IP rather than trusting a supplied value at that position - so
// the *left-most* entry (what every call site here used to read) is
// attacker-controlled, while the right-most entry is the one Vercel itself
// added. x-real-ip is a single Vercel-set value and preferred when present.
export function getClientIp(req) {
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length) return realIp.trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return req.socket?.remoteAddress ?? "unknown";
}
