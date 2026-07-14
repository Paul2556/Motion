import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { checkRateLimit, RateLimitError } from "./_lib/rateLimit.js";
import { postSourceRequestNotification } from "./_lib/postDiscordNotification.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { name, email, purpose, company } = req.body ?? {};

  // Honeypot - a bot that filled this in gets a fake success; no write
  // happens, and the response gives no signal that anything was caught.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name_required" });
    return;
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  if (typeof purpose !== "string" || !purpose.trim() || purpose.length > 500) {
    res.status(400).json({ error: "invalid_purpose" });
    return;
  }

  try {
    await checkRateLimit(clientIp(req));
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    throw error;
  }

  const db = getAdminDb();
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPurpose = purpose.trim();

  const ref = await db.collection("sourceRequests").add({
    name: trimmedName,
    email: trimmedEmail,
    purpose: trimmedPurpose,
    status: "pending",
    createdAt: Timestamp.now(),
    reviewedAt: null,
  });

  await postSourceRequestNotification({
    requestId: ref.id,
    name: trimmedName,
    email: trimmedEmail,
    purpose: trimmedPurpose,
  });

  res.status(200).json({ ok: true });
}
