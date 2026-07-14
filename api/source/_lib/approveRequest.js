import crypto from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./sendEmail.js";
import { approvalEmail } from "./emailTemplates.js";

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72h
const MAX_DOWNLOADS = 3;

// Production (fixed custom/Vercel domain) -> Preview (auto-correct to the
// specific preview deployment that issued the token) -> local `vercel dev`.
function resolveOrigin() {
  if (process.env.PUBLIC_SITE_ORIGIN) return process.env.PUBLIC_SITE_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export class RequestNotFoundError extends Error {}

// Shared by the admin-secret HTTP endpoint (approve.js) and the Discord
// interactions handler - both need the identical mint-token-and-email flow.
export async function approveRequest(requestId, { note } = {}) {
  const db = getAdminDb();
  const requestRef = db.collection("sourceRequests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new RequestNotFoundError(requestId);

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

  const downloadUrl = `${resolveOrigin()}/api/source/download?t=${token}`;
  const { subject, html } = approvalEmail({ name: data.name, downloadUrl, note });
  await sendEmail({ to: data.email, subject, html });

  return { downloadUrl };
}
