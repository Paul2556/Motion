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

// `ready` flips true only once both auth state and the permission fetch have
// resolved, so a page never briefly renders as unauthorized before its real
// permission is known.
export function usePagePermission(key) {
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => AuthService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthReady(AuthService.isReady());
  }), []);

  useEffect(() => {
    if (!authReady) return;

    // fetchMyPermissions resolves all-false for a null user, keeping one code
    // path for signed-out and signed-in, with setState only ever inside the
    // .then() rather than synchronously in the effect body.
    let cancelled = false;
    fetchMyPermissions(user).then((permissions) => {
      if (cancelled) return;
      setAllowed(Boolean(permissions[key]));
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, user, key]);

  return { allowed, ready: authReady && checked };
}
