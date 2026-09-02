import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "../firebase";
import AuthService from "./AuthService";
import { getMotions, replaceMotions, resetMotions, onMotionsChange } from "../motionPresets";
import {
  getAllShortcutOverrides,
  replaceOverrides,
  resetAllShortcuts,
  onShortcutsChange,
} from "../shortcutPrefs";

// localStorage stays the source of truth for guests, but signing in makes the
// server authoritative. "Server wins" on sign-in and reset-on-sign-out exist
// so a shared committee-room device can't leak one chair's customizations
// into the next chair's session.
const PREFS_COLLECTION = "userPrefs";

function prefsDocRef(uid) {
  return doc(getFirebaseDb(), PREFS_COLLECTION, uid);
}

// Debounced (rapid edits - e.g. drag-reordering motions - shouldn't fire one
// Firestore write per keystroke) and best-effort: a network hiccup or
// mid-flight sign-out just means this particular edit doesn't reach the
// server, never a thrown error the rest of the app has to handle.
let currentUid = null;
let pending = {};
let pushTimer = null;
const PUSH_DEBOUNCE_MS = 1000;

function schedulePush(patch) {
  if (!currentUid) return;
  const uid = currentUid;
  pending = { ...pending, ...patch };

  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const toWrite = pending;
    pending = {};
    try {
      await setDoc(prefsDocRef(uid), { ...toWrite, updatedAt: serverTimestamp() }, { merge: true });
    } catch {
      // offline/permission hiccup - this edit just won't sync this time
    }
  }, PUSH_DEBOUNCE_MS);
}

// Doc exists: that account wins unconditionally, and a reload is the only way
// to refresh components already mounted on the current page - but only for a
// live sign-in during this session. A cold page load also reports "signed
// in" the instant Firebase restores the persisted session, and nothing is
// mounted with stale prefs yet at that point, so reloading there would just
// loop forever (each reload forgets `previousUid` and sees the same restore
// as a fresh sign-in again). No doc: first sign-in anywhere, so push local up
// rather than wiping a guest's edits.
async function handleSignIn(uid, { reload }) {
  currentUid = uid;
  try {
    const snap = await getDoc(prefsDocRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.motions) replaceMotions(data.motions);
      if (data.shortcuts) replaceOverrides(data.shortcuts);
      if (reload) window.location.reload();
    } else {
      await setDoc(prefsDocRef(uid), {
        motions: getMotions(),
        shortcuts: getAllShortcutOverrides(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // offline/permission hiccup - local state just won't sync this session
  }
}

// The other half of the shared-device fix: the *next* person at this
// computer (signing in as themselves, or staying a guest) starts clean
// instead of inheriting whoever was last signed in.
function handleSignOut() {
  currentUid = null;
  resetMotions();
  resetAllShortcuts();
}

// Call once from main.jsx, alongside initAppTheme(). No-ops entirely if
// Firebase isn't configured for this deployment - same graceful degradation
// Cloud Sessions already has.
export function initPrefsSync() {
  if (!AuthService.isConfigured()) return;

  onMotionsChange((motions) => schedulePush({ motions }));
  onShortcutsChange((shortcuts) => schedulePush({ shortcuts }));

  let previousUid = null;
  // AuthService.subscribe() replays the current (possibly not-yet-resolved)
  // user synchronously, then Firebase's own onAuthStateChanged fires once
  // more with the real answer once it resolves - that first real resolution
  // is a cold-load restore, not a live sign-in. Only calls after that one
  // represent an actual sign-in/switch happening while the app is running.
  let hasSeenFirstResolution = false;

  AuthService.subscribe((user) => {
    const isColdRestore = !hasSeenFirstResolution;
    if (AuthService.isReady()) hasSeenFirstResolution = true;

    if (user && user.uid !== previousUid) {
      previousUid = user.uid;
      handleSignIn(user.uid, { reload: !isColdRestore });
    } else if (!user && previousUid !== null) {
      previousUid = null;
      handleSignOut();
    }
  });
}
