import { getAdminAuth, getAdminDb } from "../_lib/firebaseAdmin.js";
import { verifyOwner } from "../_lib/requireOwner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const owner = await verifyOwner(req);
  if (!owner) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

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
