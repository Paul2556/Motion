import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { isAdminAuthorized } from "./_lib/requireAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { requestId } = req.body ?? {};
  if (!requestId) {
    res.status(400).json({ error: "request_id_required" });
    return;
  }

  const db = getAdminDb();

  await db.collection("sourceRequests").doc(requestId).update({
    status: "revoked",
    reviewedAt: Timestamp.now(),
  });

  // Expire/delete any live tokens tied to this request, per spec.
  const tokensSnap = await db.collection("sourceTokens").where("requestId", "==", requestId).get();
  const batch = db.batch();
  tokensSnap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  res.status(200).json({ ok: true, revokedTokens: tokensSnap.size });
}
