import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

import { getFirebaseDb } from "../firebase";

const ACTIVE_SESSION_KEY = "motion-live-session-id";

class LiveSessionService {
  // sessionStorage, mirroring ConferenceService's own session-only
  // persistence - which cloud session this tab is currently broadcasting
  // to, gone once the tab closes.
  getActiveSessionId() {
    try {
      return sessionStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  }

  setActiveSessionId(sessionId) {
    try {
      if (sessionId) sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      else sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // storage unavailable (private browsing, quota) - live publishing just
      // silently stays off for this tab, same fallback ConferenceService uses.
    }
  }

  // merge:true so currentSpeaker/queue, timer, and activeMotionLabel can each
  // be published independently without one caller clobbering another's last
  // write.
  async publish(sessionId, patch) {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, "sessions", sessionId, "live", "state"),
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  // Timer.jsx's onAnchorChange hands over its own Date.now()-based `time` -
  // discarded here in favor of Firestore's serverTimestamp(), so a wrong
  // chair-laptop clock can't skew every delegate's countdown.
  async publishTimerAnchor(sessionId, { value, maxTime, running, overtime }) {
    await this.publish(sessionId, {
      timer: { anchorAt: serverTimestamp(), anchorValue: value, maxTime, running, overtime },
    });
  }

  // First onSnapshot usage in the app - returns Firestore's own unsubscribe.
  subscribe(sessionId, callback) {
    const db = getFirebaseDb();
    return onSnapshot(doc(db, "sessions", sessionId, "live", "state"), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  }
}

const liveSessionService = new LiveSessionService();
export default liveSessionService;
