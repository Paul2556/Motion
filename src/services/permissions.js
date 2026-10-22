import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "../firebase";
import AuthService from "./AuthService";
import { isOwner } from "./ownerAccess";

const DEFAULT_PERMISSIONS = { debug: false, refer: false, app: false };

// Owners implicitly have every permission and never need a Firestore round
// trip - contributorPermissions only exists to grant non-owners a subset.
export async function fetchMyPermissions(user) {
  if (!user) return DEFAULT_PERMISSIONS;
  if (isOwner(user)) return { debug: true, refer: true, app: true };

  const snap = await getDoc(doc(getFirebaseDb(), "contributorPermissions", user.uid));
  return snap.exists() ? { ...DEFAULT_PERMISSIONS, ...snap.data() } : DEFAULT_PERMISSIONS;
}

// Always settles: a failed lookup (offline, Firestore error) denies access
// but is flagged, so a gate can say so instead of waiting forever.
export async function checkPermission(user, key) {
  try {
    const permissions = await fetchMyPermissions(user);
    return { allowed: Boolean(permissions[key]), failed: false };
  } catch (error) {
    console.warn("Couldn't check access:", error);
    return { allowed: false, failed: true };
  }
}

// `ready` flips true only once both auth state and the permission check have
// settled, so a page never briefly renders as unauthorized before its real
// permission is known.
export function usePagePermission(key) {
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());
  const [result, setResult] = useState(null);

  useEffect(() => AuthService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthReady(AuthService.isReady());
  }), []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    checkPermission(user, key).then((next) => {
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user, key]);

  return { allowed: result?.allowed ?? false, failed: result?.failed ?? false, ready: authReady && result !== null };
}
