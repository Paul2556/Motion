import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Lazy singleton mirroring src/firebase.js for the server side. One base64
// service-account env var avoids the private_key newline-escaping bug an env
// var UI introduces.
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
