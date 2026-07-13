import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reading import.meta.env.VITE_* is always safe (undefined if unset, e.g. in
// CI which never injects these) - only *using* an incomplete config throws,
// which is why nothing below runs until a caller actually asks for it.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

export function isFirebaseConfigured() {
  return REQUIRED_KEYS.every((key) => Boolean(config[key]));
}

let app = null;
let authInstance = null;
let dbInstance = null;

// Only reached lazily from getFirebaseAuth()/getFirebaseDb() below, never at
// module load, so a build/preview with no Firebase env vars never throws.
function getApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured (missing VITE_FIREBASE_* env vars).");
  }

  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(config);
  }

  return app;
}

export function getFirebaseAuth() {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

export function getFirebaseDb() {
  if (!dbInstance) dbInstance = getFirestore(getApp());
  return dbInstance;
}
