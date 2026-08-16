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

// Same authReady-gating pattern OwnerGate/DebugPage/ReferPage already used
// with isAuthorizedUser, extended with the extra async permissions fetch -
// `ready` only flips true once both auth state and the permission check have
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

    // fetchMyPermissions resolves to all-false for a null user, so this
    // stays one code path for both the signed-out and signed-in cases -
    // setState only ever happens inside the .then() callback, never
    // synchronously in the effect body (same constraint AdminPanelPage.jsx's
    // own mount-fetch effects already follow).
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
