import { getAdminAuth } from "../_lib/firebaseAdmin.js";
import { verifyOwner } from "../_lib/requireOwner.js";

// AuthService.createQuickLoginLink() spins up throwaway
// quick-*@motion-quicklogin.local accounts for Cloud Sessions' QR flow -
// these are real Firebase Auth users and will appear here, flagged so the
// admin panel can list/filter them distinctly rather than mixing them in
// with real chair accounts.
const QUICK_LOGIN_DOMAIN = "@motion-quicklogin.local";

function toRecord(userRecord) {
  return {
    uid: userRecord.uid,
    email: userRecord.email ?? null,
    displayName: userRecord.displayName ?? null,
    disabled: userRecord.disabled,
    creationTime: userRecord.metadata.creationTime,
    lastSignInTime: userRecord.metadata.lastSignInTime,
    isQuickLogin: Boolean(userRecord.email?.endsWith(QUICK_LOGIN_DOMAIN)),
  };
}

// listUsers() pages at up to 1000 per call - looped here so the admin panel
// always gets the full list in one request rather than reimplementing
// pagination client-side for what's realistically a small user base.
async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await getAdminAuth().listUsers(1000, pageToken);
    users.push(...page.users.map(toRecord));
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const owner = await verifyOwner(req);
  if (!owner) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const users = await listAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "internal_error", message: error.message });
  }
}
