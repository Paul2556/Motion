import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../source/_lib/firebaseAdmin.js";
import { checkRateLimit, RateLimitError } from "../source/_lib/rateLimit.js";
import { getClientIp } from "../source/_lib/clientIp.js";
import { sendEmail } from "../source/_lib/sendEmail.js";
import { waitlistWelcomeEmail } from "../source/_lib/emailTemplates.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 day

function hashEmail(email) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { email, company } = req.body ?? {};

  // Honeypot - see api/feedback/submit.js for the same pattern. This endpoint
  // is called directly from the client (LandingPage.jsx), unauthenticated,
  // so it's reachable by anyone who can read the bundle - the honeypot plus
  // the per-address cooldown below are what keep it from being an open
  // mail-relay rather than any server-side proof the caller actually
  // completed the waitlist form.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  try {
    // Keyed separately from the other IP-keyed rate limits (source requests, feedback) so none
    // of them share a budget.
    await checkRateLimit(`waitlist:${getClientIp(req)}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    throw error;
  }

  const trimmedEmail = email.trim();
  const db = getAdminDb();
  const cooldownRef = db.collection("waitlistSends").doc(hashEmail(trimmedEmail));

  // Caps mail-bomb impact on a single destination address even under IP
  // rotation, which the rate limit above can't defend against on its own -
  // silently no-ops (same fake-success shape as the honeypot) rather than
  // erroring, so a caller gets no signal either way.
  const cooldownSnap = await cooldownRef.get();
  if (cooldownSnap.exists && Date.now() - cooldownSnap.data().lastSentAt.toMillis() < SEND_COOLDOWN_MS) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const { subject, html } = waitlistWelcomeEmail();
    await sendEmail({ to: trimmedEmail, subject, html });
  } catch (error) {
    // Caught (rather than left to crash the function) so a Resend failure - e.g. a missing
    // RESEND_API_KEY - shows up as a normal, diagnosable JSON error instead of Vercel's opaque
    // FUNCTION_INVOCATION_FAILED page.
    console.error("Failed to send waitlist welcome email:", error);
    res.status(500).json({ error: "email_failed" });
    return;
  }

  await cooldownRef.set({ lastSentAt: Timestamp.now() });

  res.status(200).json({ ok: true });
}
