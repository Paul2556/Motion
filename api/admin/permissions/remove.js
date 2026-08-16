import { getAdminDb } from "../_lib/firebaseAdmin.js";
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
    await getAdminDb().collection("contributorPermissions").doc(uid).delete();
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "internal_error", message: error.message });
  }
}
