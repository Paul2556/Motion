import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Same lazy-singleton shape as src/firebase.js's getFirebaseDb() (this
// repo's one existing Firebase init pattern), mirrored here for the
// server-side equivalent. A single base64-encoded service-account env var
// (rather than separate project-id/client-email/private-key vars) sidesteps
// the classic private_key-contains-literal-\n escaping bug you get when an
// env var UI mangles embedded newlines.
let dbInstance = null;

function getApp() {
  if (getApps().length) return getApps()[0];

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 is not set.");
  }

  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  return initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminDb() {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}
