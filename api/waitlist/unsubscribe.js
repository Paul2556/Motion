import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../source/_lib/firebaseAdmin.js";
import { verifyUnsubscribeToken } from "../source/_lib/unsubscribeToken.js";

function hashEmail(email) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

function htmlPage(message) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Motion</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;}
p{max-width:28rem;text-align:center;padding:0 1.5rem;}</style></head>
<body><p>${message}</p></body></html>`;
}

// Public GET, reached from a link in an email client - not a SPA route, so
// this responds with a small static page directly rather than redirecting
// into the app.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).send(htmlPage("Method not allowed."));
    return;
  }

  const { email, token } = req.query ?? {};
  if (typeof email !== "string" || !verifyUnsubscribeToken(email, token)) {
    res.status(400).setHeader("Content-Type", "text/html").send(htmlPage("This unsubscribe link is invalid."));
    return;
  }

  try {
    await getAdminDb().collection("waitlistSubscribers").doc(hashEmail(email)).set(
      { unsubscribed: true, unsubscribedAt: Timestamp.now() },
      { merge: true },
    );
  } catch (error) {
    console.error("unsubscribe failed:", error);
    res.status(500).setHeader("Content-Type", "text/html").send(htmlPage("Something went wrong. Please try again later."));
    return;
  }

  res.status(200).setHeader("Content-Type", "text/html").send(htmlPage("You've been unsubscribed from Motion emails."));
}
