import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "./_lib/firebaseAdmin.js";
import { verifyOwner } from "./_lib/requireOwner.js";
import { mapAuthError } from "./_lib/mapAuthError.js";

// Merged list/set/remove into one dispatched handler (GET = list, POST
// {action} = set/remove) - Vercel's Hobby plan caps a deployment at 12
// serverless functions, and three separate files here was what pushed the
// project over that cap. See .claude/issues.md's SEC-008 for why this
// collection exists.
const DEFAULT_PERMISSIONS = { debug: true, refer: false, app: false };

async function listPermissions(res) {
  try {
    const snap = await getAdminDb().collection("contributorPermissions").get();
    const contributors = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.status(200).json({ contributors });
  } catch (error) {
    console.error("listPermissions failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

async function setPermission(req, res, owner) {
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
    console.error("setPermission failed:", error);
    res.status(500).json({ error: "internal_error", code: mapAuthError(error) });
  }
}

async function removePermission(req, res) {
  const { uid } = req.body ?? {};
  if (!uid) {
    res.status(400).json({ error: "uid_required" });
    return;
  }

  try {
    await getAdminDb().collection("contributorPermissions").doc(uid).delete();
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("removePermission failed:", error);
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
    await listPermissions(res);
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { action } = req.body ?? {};
  if (action === "set") {
    await setPermission(req, res, owner);
    return;
  }
  if (action === "remove") {
    await removePermission(req, res);
    return;
  }

  res.status(400).json({ error: "invalid_action" });
}
