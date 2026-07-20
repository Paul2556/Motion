import { checkRateLimit, RateLimitError } from "../source/_lib/rateLimit.js";
import { sendEmail } from "../source/_lib/sendEmail.js";
import { waitlistWelcomeEmail } from "../source/_lib/emailTemplates.js";

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

  const { email } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  try {
    // Keyed separately from the other IP-keyed rate limits (source requests, feedback) so none
    // of them share a budget.
    await checkRateLimit(`waitlist:${clientIp(req)}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    throw error;
  }

  const { subject, html } = waitlistWelcomeEmail();
  await sendEmail({ to: email.trim(), subject, html });

  res.status(200).json({ ok: true });
}
