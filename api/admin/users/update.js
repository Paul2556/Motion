import { getAdminAuth } from "../_lib/firebaseAdmin.js";
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
