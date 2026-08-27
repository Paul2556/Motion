import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Its own copy rather than a cross-directory import, so api/admin stays
// self-contained. One base64 service-account env var avoids the classic
// private_key newline-escaping bug.
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
