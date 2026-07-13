import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { isAdminAuthorized } from "./_lib/requireAdmin.js";

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72h
const MAX_DOWNLOADS = 3;

// Production (fixed custom/Vercel domain) -> Preview (auto-correct to the
// specific preview deployment that issued the token) -> local `vercel dev`.
function resolveOrigin() {
  if (process.env.PUBLIC_SITE_ORIGIN) return process.env.PUBLIC_SITE_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { requestId } = req.body ?? {};
  if (!requestId) {
    res.status(400).json({ error: "request_id_required" });
    return;
  }

  const db = getAdminDb();
  const requestRef = db.collection("sourceRequests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const data = requestSnap.data();
  // Deliberately idempotent/re-callable - doesn't check or block on prior
  // status, and always mints a fresh token, so re-granting access after a
  // token has lapsed doesn't need a separate "reissue" endpoint.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenRef = db.collection("sourceTokens").doc(token);
  const now = Timestamp.now();

  const batch = db.batch();
  batch.update(requestRef, { status: "approved", reviewedAt: now });
  batch.set(tokenRef, {
    requestId,
    name: data.name,
    email: data.email,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + TOKEN_TTL_MS),
    maxDownloads: MAX_DOWNLOADS,
    downloads: [],
  });
  await batch.commit();

  res.status(200).json({ downloadUrl: `${resolveOrigin()}/api/source/download?t=${token}` });
}
