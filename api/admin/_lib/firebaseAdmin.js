import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Same lazy-singleton shape as api/source/_lib/firebaseAdmin.js (this repo's
// established server-side Firebase Admin pattern) - kept as its own copy
// rather than importing across feature directories, so api/admin stays
// self-contained the same way api/source already is. Single base64-encoded
// service-account env var (not separate project-id/client-email/private-key
// vars) sidesteps the classic private_key-contains-literal-\n escaping bug.
let authInstance = null;
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

export function getAdminAuth() {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function getAdminDb() {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}
