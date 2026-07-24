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

// Account-synced motion presets/shortcuts - localStorage stays the source of
// truth for guests (unchanged from before this existed), but signing in
// makes the *server* the source of truth for these two prefs specifically.
// This isn't just a "merge for convenience" - it exists to fix a real
// problem: a shared committee-room device used by different chairs across
// conferences would otherwise leak one chair's customizations into the
// next's session. "Server wins" on sign-in, and a reset-to-defaults on
// sign-out, are both deliberate fixes for that, not just a sync nicety.
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

// Doc exists -> that account's data always wins, unconditionally (the
// "shared device" fix) - overwrite local storage and reload so every
// mounted component picks up the fresh state (this app's routes are flat
// siblings that always remount on navigation - see motionPresets.js - but
// a reload is the only way to also refresh whatever's already mounted on
// the *current* page).
// No doc yet -> a brand-new account's first sign-in anywhere, nothing to
// pull down - push whatever's currently local up as its starting point,
// so a guest's just-made edits aren't wiped for no reason.
async function handleSignIn(uid) {
  currentUid = uid;
  try {
    const snap = await getDoc(prefsDocRef(uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.motions) replaceMotions(data.motions);
      if (data.shortcuts) replaceOverrides(data.shortcuts);
      window.location.reload();
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
  AuthService.subscribe((user) => {
    if (user && user.uid !== previousUid) {
      previousUid = user.uid;
      handleSignIn(user.uid);
    } else if (!user && previousUid !== null) {
      previousUid = null;
      handleSignOut();
    }
  });
}
