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
