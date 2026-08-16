import { getAdminDb } from "../_lib/firebaseAdmin.js";
import { verifyOwner } from "../_lib/requireOwner.js";

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
    const snap = await getAdminDb().collection("contributorPermissions").get();
    const contributors = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.status(200).json({ contributors });
  } catch (error) {
    res.status(500).json({ error: "internal_error", message: error.message });
  }
}
