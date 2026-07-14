import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./sendEmail.js";
import { denialEmail } from "./emailTemplates.js";

export class RequestNotFoundError extends Error {}

// Shared by the admin-secret HTTP endpoint (deny.js) and the Discord
// interactions handler.
export async function denyRequest(requestId) {
  const db = getAdminDb();
  const requestRef = db.collection("sourceRequests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new RequestNotFoundError(requestId);

  const data = requestSnap.data();
  await requestRef.update({ status: "denied", reviewedAt: Timestamp.now() });

  const { subject, html } = denialEmail({ name: data.name });
  await sendEmail({ to: data.email, subject, html });
}
