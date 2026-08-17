import { getAdminAuth, getAdminDb } from "./_lib/firebaseAdmin.js";
import { verifyOwner } from "./_lib/requireOwner.js";

// Merged list/create/update/delete into one dispatched handler (GET = list,
// POST {action} = create/update/delete) - Vercel's Hobby plan caps a
// deployment at 12 serverless functions, and four separate files here was
// part of what pushed the project over that cap.

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

async function listUsersHandler(res) {
  try {
    const users = await listAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "internal_error", message: error.message });
  }
}

async function createUser(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email_and_password_required" });
    return;
  }

  try {
    const userRecord = await getAdminAuth().createUser({ email, password });
    res.status(200).json({ uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: "create_failed", message: error.message });
  }
}

async function updateUser(req, res) {
  const { uid, email, password, disabled } = req.body ?? {};
  if (!uid) {
    res.status(400).json({ error: "uid_required" });
    return;
  }

  // Only ever patches fields the caller actually sent - omitting a field
  // (rather than passing it as undefined) leaves it untouched, matching
  // updateUser's own "only provided fields change" semantics.
  const patch = {};
  if (email !== undefined) patch.email = email;
  if (password !== undefined) patch.password = password;
  if (disabled !== undefined) patch.disabled = disabled;

  try {
    await getAdminAuth().updateUser(uid, patch);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "update_failed", message: error.message });
  }
}

async function deleteUser(req, res) {
  const { uid } = req.body ?? {};
  if (!uid) {
    res.status(400).json({ error: "uid_required" });
    return;
  }

  try {
    await getAdminAuth().deleteUser(uid);
  } catch (error) {
    res.status(400).json({ error: "delete_failed", message: error.message });
    return;
  }

  // Best-effort cleanup of this feature's own data - a failure here doesn't
  // roll back the account deletion above, it just leaves an orphaned doc
  // (harmless: unreadable by anyone once the uid it's keyed to no longer
  // corresponds to a signed-in user).
  try {
    await getAdminDb().collection("userPrefs").doc(uid).delete();
  } catch {
    // orphaned doc - harmless, see above
  }

  res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  const owner = await verifyOwner(req);
  if (!owner) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    await listUsersHandler(res);
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { action } = req.body ?? {};
  if (action === "create") {
    await createUser(req, res);
    return;
  }
  if (action === "update") {
    await updateUser(req, res);
    return;
  }
  if (action === "delete") {
    await deleteUser(req, res);
    return;
  }

  res.status(400).json({ error: "invalid_action" });
}
