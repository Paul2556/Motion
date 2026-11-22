import { createHash } from "node:crypto";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin.js";

export const AUDIENCES = ["waitlist", "users", "both"];

// QR-login throwaway accounts (see users.js) have undeliverable addresses.
const QUICK_LOGIN_DOMAIN = "@motion-quicklogin.local";

export function hashEmail(email) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

async function listAccountEmails() {
  const emails = new Set();
  let pageToken;
  do {
    const page = await getAdminAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      const email = user.email?.toLowerCase();
      if (email && !user.disabled && !email.endsWith(QUICK_LOGIN_DOMAIN)) emails.add(email);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return emails;
}

// One opt-out list for every audience: emailOptOuts (written by the
// unsubscribe link) plus waitlist rows flagged before that collection existed.
// Both are keyed by hashEmail, so a match never needs the plaintext address.
export async function loadAudiences() {
  const db = getAdminDb();
  const [waitlistSnap, optOutSnap, accountEmails] = await Promise.all([
    db.collection("waitlistSubscribers").get(),
    db.collection("emailOptOuts").get(),
    listAccountEmails(),
  ]);

  const optedOut = new Set(optOutSnap.docs.map((d) => d.id));
  const waitlistEmails = new Set();
  for (const doc of waitlistSnap.docs) {
    const { email, unsubscribed } = doc.data();
    if (unsubscribed) optedOut.add(doc.id);
    else if (email) waitlistEmails.add(email.toLowerCase());
  }

  const reachable = (emails) => [...emails].filter((email) => !optedOut.has(hashEmail(email)));
  const waitlist = reachable(waitlistEmails);
  const users = reachable(accountEmails);
  return { waitlist, users, both: [...new Set([...waitlist, ...users])] };
}

export async function loadRecipients(audience) {
  return (await loadAudiences())[audience];
}
