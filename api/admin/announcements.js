import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { verifyOwner } from "./_lib/requireOwner.js";
import { mapAuthError } from "./_lib/mapAuthError.js";
import { sendEmailBatch } from "../source/_lib/sendEmail.js";
import { announcementEmail } from "../source/_lib/emailTemplates.js";
import { createUnsubscribeToken } from "../source/_lib/unsubscribeToken.js";

// Merged list/import/send into one dispatched handler (GET = list, POST
// {action} = import/send), same reasoning as users.js/permissions.js: Vercel's
// Hobby plan caps a deployment at 12 serverless functions.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 100; // Resend's /emails/batch cap
const BATCH_DELAY_MS = 600; // courtesy gap between batch calls

function hashEmail(email) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listSubscribers(res) {
  try {
    const snap = await getAdminDb().collection("waitlistSubscribers").get();
    const subscribers = snap.docs.map((d) => {
      const data = d.data();
      return {
        email: data.email,
        source: data.source,
        unsubscribed: Boolean(data.unsubscribed),
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    });
    const unsubscribedCount = subscribers.filter((s) => s.unsubscribed).length;
    res.status(200).json({ subscribers, total: subscribers.length, unsubscribedCount });
  } catch (error) {
    console.error("listSubscribers failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

async function importSubscribers(req, res) {
  const { emails } = req.body ?? {};
  if (!Array.isArray(emails)) {
    res.status(400).json({ error: "emails_required" });
    return;
  }

  const normalized = [...new Set(
    emails.map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)),
  )];

  const db = getAdminDb();
  let imported = 0;
  let skipped = 0;

  try {
    for (const email of normalized) {
      const ref = db.collection("waitlistSubscribers").doc(hashEmail(email));
      const snap = await ref.get();
      if (snap.exists) {
        skipped += 1;
        continue;
      }
      await ref.set({ email, source: "import", unsubscribed: false, createdAt: Timestamp.now() });
      imported += 1;
    }
    res.status(200).json({ imported, skipped });
  } catch (error) {
    console.error("importSubscribers failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

async function sendAnnouncement(req, res) {
  const { subject, body } = req.body ?? {};
  if (typeof subject !== "string" || !subject.trim() || typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "subject_and_body_required" });
    return;
  }

  const db = getAdminDb();
  let recipients;
  try {
    const snap = await db.collection("waitlistSubscribers").where("unsubscribed", "==", false).get();
    recipients = snap.docs.map((d) => d.data().email);
  } catch (error) {
    console.error("loading subscribers for send failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
    return;
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const messages = chunk.map((email) => {
      const unsubscribeUrl = `https://motionmun.com/api/waitlist/unsubscribe?email=${encodeURIComponent(email)}&token=${createUnsubscribeToken(email)}`;
      const { subject: renderedSubject, html } = announcementEmail({ subject, body, unsubscribeUrl });
      return { to: email, subject: renderedSubject, html };
    });

    try {
      await sendEmailBatch(messages);
      sent += chunk.length;
    } catch (error) {
      console.error("sendEmailBatch failed:", error);
      failed += chunk.length;
    }

    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  res.status(200).json({ sent, failed });
}

export default async function handler(req, res) {
  const owner = await verifyOwner(req);
  if (!owner) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    await listSubscribers(res);
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { action } = req.body ?? {};
  if (action === "import") {
    await importSubscribers(req, res);
    return;
  }
  if (action === "send") {
    await sendAnnouncement(req, res);
    return;
  }

  res.status(400).json({ error: "invalid_action" });
}
