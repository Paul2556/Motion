import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../_lib/firebaseAdmin.js";
import { verifyOwner } from "../_lib/requireOwner.js";

// New contributors default to debug-page access only - callers may pass
// refer/app explicitly to grant more, but omitting them (the "add
// contributor" form's normal case) must never silently grant anything wider
// than this, so the default is enforced here, not just in the UI.
const DEFAULT_PERMISSIONS = { debug: true, refer: false, app: false };

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

  const { email, debug, refer, app } = req.body ?? {};
  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: "email_required" });
    return;
  }

  let userRecord;
  try {
    userRecord = await getAdminAuth().getUserByEmail(email.trim());
  } catch {
    res.status(404).json({ error: "user_not_found", message: "That email has never signed in - have them sign in once (or create their account first), then grant access." });
    return;
  }

  const db = getAdminDb();
  const ref = db.collection("contributorPermissions").doc(userRecord.uid);

  try {
    const existing = await ref.get();
    const base = existing.exists ? existing.data() : { ...DEFAULT_PERMISSIONS, addedAt: Timestamp.now(), addedBy: owner.email };

    await ref.set({
      ...base,
      email: userRecord.email,
      ...(typeof debug === "boolean" && { debug }),
      ...(typeof refer === "boolean" && { refer }),
      ...(typeof app === "boolean" && { app }),
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "internal_error", message: error.message });
  }
}
