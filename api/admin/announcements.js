import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { verifyOwner } from "./_lib/requireOwner.js";
import { mapAuthError } from "./_lib/mapAuthError.js";
import { sendEmailBatch } from "../source/_lib/sendEmail.js";
import { announcementEmail } from "../source/_lib/emailTemplates.js";
import { createUnsubscribeToken } from "../source/_lib/unsubscribeToken.js";
import { AUDIENCES, hashEmail, loadAudiences, loadRecipients } from "./_lib/recipients.js";

// Merged list/import/send into one dispatched handler (GET = list, POST
// {action} = import/start/continue/retryFailed), same reasoning as
// users.js/permissions.js: Vercel's Hobby plan caps a deployment at 12
// serverless functions. A send is many short calls rather than one long one,
// so no audience size can run a call past the function time limit.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 100; // Resend's /emails/batch cap, and one send call's work
const FIRESTORE_BATCH_LIMIT = 500; // writes per Firestore batch

async function listSubscribers(res) {
  try {
    const db = getAdminDb();
    const [snap, latest, audiences] = await Promise.all([
      db.collection("waitlistSubscribers").get(),
      db.collection("announcements").orderBy("createdAt", "desc").limit(1).get(),
      loadAudiences(),
    ]);
    // Email-less rows are opt-outs older unsubscribe links left behind, not subscribers.
    const subscribers = snap.docs.map((d) => d.data()).filter((data) => data.email).map((data) => ({
      email: data.email,
      source: data.source,
      unsubscribed: Boolean(data.unsubscribed),
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    }));
    const unsubscribedCount = subscribers.filter((s) => s.unsubscribed).length;
    // The most recent send, so the panel can offer to resume it if the tab
    // closed or a call failed before it finished.
    const lastAnnouncement = latest.empty ? null : storedSummary(latest.docs[0]);
    const { waitlist, users, both } = audiences;
    res.status(200).json({
      subscribers,
      total: subscribers.length,
      unsubscribedCount,
      lastAnnouncement,
      // Exact send sizes for the confirm button, after dedup and opt-outs.
      audiences: { waitlist: waitlist.length, users: users.length, both: both.length },
      overlap: waitlist.length + users.length - both.length,
    });
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

// The audience is re-read on every chunk, so anyone who unsubscribes mid-send
// is skipped. Sends started before audiences existed went to the waitlist.
const recipientsOf = (announcement) => loadRecipients(announcement.audience ?? "waitlist");

// One marker per recipient under the announcement, recording whether their
// batch was accepted. A recipient with a marker is never picked again.
async function loadDeliveries(announcementRef) {
  const snap = await announcementRef.collection("deliveries").get();
  return new Map(snap.docs.map((d) => [d.data().email, d.data().status]));
}

function pendingRecipients(recipients, deliveries) {
  const unique = new Set(recipients.map((email) => String(email).trim().toLowerCase()));
  return [...unique].filter((email) => !deliveries.has(email)).sort();
}

function summarize(id, subject, recipients, deliveries) {
  const statuses = [...deliveries.values()];
  const remaining = pendingRecipients(recipients, deliveries).length;
  return {
    id,
    subject,
    status: remaining === 0 ? "done" : "sending",
    sent: statuses.filter((s) => s === "sent").length,
    failed: statuses.filter((s) => s === "failed").length,
    remaining,
  };
}

function storedSummary(doc) {
  const { subject, status, sent, failed, remaining } = doc.data();
  return { id: doc.id, subject, status, sent, failed, remaining };
}

// Same announcement + same recipients = same key, so a retry of a batch that
// Resend accepted but this function never recorded (timeout, crash) is
// dropped by Resend instead of emailing those people twice. The key is reused
// even after a Resend error: if Resend replays that error, the batch stays
// visibly failed, which beats risking a silent duplicate.
function chunkIdempotencyKey(id, emails) {
  return `announcement/${id}/${createHash("sha256").update(emails.join("\n")).digest("hex")}`;
}

function announcementMessages(emails, { subject, body }) {
  return emails.map((email) => {
    const unsubscribeUrl = `https://motionmun.com/api/waitlist/unsubscribe?email=${encodeURIComponent(email)}&token=${createUnsubscribeToken(email)}`;
    const { subject: renderedSubject, html } = announcementEmail({ subject, body, unsubscribeUrl });
    return { to: email, subject: renderedSubject, html };
  });
}

// Records the announcement without emailing anyone; the admin panel then
// calls `continue` until it reports "done". Sending the same text to the same
// audience while the last send is unfinished resumes that send rather than
// starting over.
async function startAnnouncement(req, res) {
  const { subject, body, audience } = req.body ?? {};
  if (typeof subject !== "string" || !subject.trim() || typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "subject_and_body_required" });
    return;
  }
  if (!AUDIENCES.includes(audience)) {
    res.status(400).json({ error: "invalid_audience" });
    return;
  }

  try {
    const db = getAdminDb();
    const [recipients, latest] = await Promise.all([
      loadRecipients(audience),
      db.collection("announcements").orderBy("createdAt", "desc").limit(1).get(),
    ]);

    const previous = latest.docs[0];
    const unfinished = previous?.data();
    if (
      unfinished?.status === "sending" &&
      unfinished.subject === subject &&
      unfinished.body === body &&
      (unfinished.audience ?? "waitlist") === audience
    ) {
      const deliveries = await loadDeliveries(previous.ref);
      res.status(200).json({ announcement: summarize(previous.id, subject, recipients, deliveries) });
      return;
    }

    const ref = db.collection("announcements").doc();
    const announcement = summarize(ref.id, subject, recipients, new Map());
    await ref.set({ subject, body, audience, createdAt: Timestamp.now(), ...announcement });
    res.status(200).json({ announcement });
  } catch (error) {
    console.error("startAnnouncement failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

// Answers 400/404 itself and returns null when there is no such announcement.
async function findAnnouncement(db, req, res) {
  const { id } = req.body ?? {};
  // Firestore auto-IDs are alphanumeric; a "/" would address a nested path.
  if (typeof id !== "string" || !/^[A-Za-z0-9]+$/.test(id)) {
    res.status(400).json({ error: "id_required" });
    return null;
  }
  const snap = await db.collection("announcements").doc(id).get();
  if (!snap.exists) {
    res.status(404).json({ error: "announcement_not_found" });
    return null;
  }
  return snap;
}

// Sends one batch to the next recipients without a marker, so each call does
// a bounded amount of work however large the audience is.
async function continueAnnouncement(req, res) {
  try {
    const db = getAdminDb();
    const snap = await findAnnouncement(db, req, res);
    if (!snap) return;
    const { id, ref } = snap;
    const { subject, body } = snap.data();
    const [recipients, deliveries] = await Promise.all([recipientsOf(snap.data()), loadDeliveries(ref)]);

    const chunk = pendingRecipients(recipients, deliveries).slice(0, BATCH_SIZE);
    if (chunk.length > 0) {
      let status = "sent";
      try {
        await sendEmailBatch(announcementMessages(chunk, { subject, body }), {
          idempotencyKey: chunkIdempotencyKey(id, chunk),
        });
      } catch (error) {
        console.error("sendEmailBatch failed:", error);
        status = "failed";
      }
      for (const email of chunk) deliveries.set(email, status);

      const batch = db.batch();
      for (const email of chunk) {
        batch.set(ref.collection("deliveries").doc(hashEmail(email)), { email, status, at: Timestamp.now() });
      }
      batch.set(ref, summarize(id, subject, recipients, deliveries), { merge: true });
      await batch.commit();
    }

    res.status(200).json({ announcement: summarize(id, subject, recipients, deliveries) });
  } catch (error) {
    console.error("continueAnnouncement failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

// Clears the failed markers so `continue` sends to those recipients again.
async function retryFailed(req, res) {
  try {
    const db = getAdminDb();
    const snap = await findAnnouncement(db, req, res);
    if (!snap) return;
    const { id, ref } = snap;

    const failed = await ref.collection("deliveries").where("status", "==", "failed").get();
    for (let i = 0; i < failed.docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      for (const doc of failed.docs.slice(i, i + FIRESTORE_BATCH_LIMIT)) batch.delete(doc.ref);
      await batch.commit();
    }

    const [recipients, deliveries] = await Promise.all([recipientsOf(snap.data()), loadDeliveries(ref)]);
    const announcement = summarize(id, snap.data().subject, recipients, deliveries);
    await ref.set(announcement, { merge: true });
    res.status(200).json({ announcement });
  } catch (error) {
    console.error("retryFailed failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
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
  if (action === "start") {
    await startAnnouncement(req, res);
    return;
  }
  if (action === "continue") {
    await continueAnnouncement(req, res);
    return;
  }
  if (action === "retryFailed") {
    await retryFailed(req, res);
    return;
  }

  res.status(400).json({ error: "invalid_action" });
}
