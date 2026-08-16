import { checkRateLimit, RateLimitError } from "../source/_lib/rateLimit.js";
import { getClientIp } from "../source/_lib/clientIp.js";
import { postFeedbackNotification } from "./_lib/postFeedbackNotification.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 2000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { message, email, company } = req.body ?? {};

  // Honeypot - see api/source/request.js for the same pattern.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: "invalid_message" });
    return;
  }
  if (email && (typeof email !== "string" || !EMAIL_RE.test(email))) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  try {
    // Keyed separately from api/source/request.js's rate limit so the two features don't share
    // one IP-keyed budget.
    await checkRateLimit(`feedback:${getClientIp(req)}`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    throw error;
  }

  await postFeedbackNotification({
    message: message.trim(),
    email: email?.trim() || null,
  });

  res.status(200).json({ ok: true });
}
