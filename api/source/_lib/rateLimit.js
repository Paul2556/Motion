import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

export class RateLimitError extends Error {}

// Firestore-backed, not in-memory - Vercel functions are stateless across
// invocations (no shared memory between cold/warm instances), so an
// in-memory counter would rarely trigger meaningfully despite the original
// spec allowing it as an option. Same runTransaction shape as
// CloudSessionService.js's addDay (read, decide, tx.update in one pass).
export async function checkRateLimit(ip) {
  const db = getAdminDb();
  const ref = db.collection("rateLimits").doc(ip || "unknown");

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Timestamp.now();

    if (!snap.exists || now.toMillis() - snap.data().windowStart.toMillis() > WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }

    const count = snap.data().count;
    if (count >= MAX_REQUESTS_PER_WINDOW) {
      throw new RateLimitError("Too many requests");
    }

    tx.update(ref, { count: count + 1 });
  });
}
