import { createHmac, timingSafeEqual } from "node:crypto";

// Deterministic HMAC rather than a stored per-send token - re-verified on
// click, so no extra Firestore doc/collection is needed to track issued links.
function sign(email) {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET).update(email.toLowerCase()).digest("hex");
}

export function createUnsubscribeToken(email) {
  return sign(email);
}

export function verifyUnsubscribeToken(email, token) {
  if (typeof token !== "string" || !token) return false;
  const expected = sign(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
