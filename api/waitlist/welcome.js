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

  const { email, company, utm_source, utm_medium, utm_campaign, referrer } = req.body ?? {};

  // Unauthenticated and reachable by anyone who reads the bundle, so the
  // honeypot plus the per-address cooldown below are what keep this from
  // being an open mail relay.
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

  // Server-side now: as a direct client -> Apps Script call, the webhook URL
  // sat in the public bundle for anyone to POST fake rows to. Blocking, not
  // best-effort, since this write is the source of truth for the signup.
  if (!process.env.WAITLIST_SHEET_WEBHOOK_URL) {
    console.error("WAITLIST_SHEET_WEBHOOK_URL is not set");
    res.status(500).json({ error: "sheet_not_configured" });
    return;
  }

  try {
    const sheetForm = new FormData();
    sheetForm.append("email", trimmedEmail);
    sheetForm.append("utm_source", utm_source || "");
    sheetForm.append("utm_medium", utm_medium || "");
    sheetForm.append("utm_campaign", utm_campaign || "");
    sheetForm.append("referrer", referrer || "");

    const sheetResponse = await fetch(process.env.WAITLIST_SHEET_WEBHOOK_URL, {
      method: "POST",
      body: sheetForm,
    });
    if (!sheetResponse.ok) {
      console.error("Waitlist sheet write failed:", sheetResponse.status, await sheetResponse.text());
      res.status(502).json({ error: "sheet_write_failed" });
      return;
    }
  } catch (error) {
    console.error("Waitlist sheet write failed:", error);
    res.status(502).json({ error: "sheet_write_failed" });
    return;
  }

  const db = getAdminDb();
  const emailHash = hashEmail(trimmedEmail);
  const cooldownRef = db.collection("waitlistSends").doc(emailHash);

  // Recorded for the admin panel's Announcements tab (api/admin/announcements.js) - plaintext,
  // unlike the sha256-only waitlistSends doc above, since that one exists purely as a resend
  // cooldown key and was never meant to be readable back into an email list. unsubscribed is
  // reset to false so a repeat signup after a prior unsubscribe re-opts in; createdAt is only
  // set the first time, so a repeat signup doesn't bump their original join date.
  const subscriberRef = db.collection("waitlistSubscribers").doc(emailHash);
  const subscriberSnap = await subscriberRef.get();
  await subscriberRef.set(
    {
      email: trimmedEmail,
      source: "signup",
      unsubscribed: false,
      ...(subscriberSnap.exists ? {} : { createdAt: Timestamp.now() }),
    },
    { merge: true },
  );

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
