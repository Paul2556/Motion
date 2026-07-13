import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { getFirebaseDb } from "../firebase";

// Country name is the one thing stable across a re-upload of the same (or a
// day-2) workbook, unlike ConferenceService's delegate.id, which is a fresh
// crypto.randomUUID() on every parse. Mirrors the identity anchor
// ConferenceService.validateConference() already uses for its own dedup check.
export function stableDelegateKey(countryName) {
  return (
    String(countryName ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

class CloudSessionService {
  // memberIds always starts as just [ownerId] - collaborators get appended
  // via addCollaborator. firestore.rules keys every access check (including
  // days/attendance, via one get() on this doc) off this single list, so an
  // owner is just a member who also happens to satisfy the extra
  // owner-only checks (rename, delete, managing collaborators).
  async createSession({ title, committeeId, ownerId }) {
    const db = getFirebaseDb();
    const ref = await addDoc(collection(db, "sessions"), {
      title,
      committeeId,
      ownerId,
      memberIds: [ownerId],
      createdAt: serverTimestamp(),
      dayCount: 0,
    });
    return ref.id;
  }

  // Sorts client-side by createdAt instead of an orderBy+where composite
  // index - not worth it at this app's ~2-conference scale.
  async listMySessions(uid) {
    const db = getFirebaseDb();
    const snap = await getDocs(query(collection(db, "sessions"), where("memberIds", "array-contains", uid)));
    const sessions = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    return sessions.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  }

  async addCollaborator(sessionId, collaboratorUid) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "sessions", sessionId), { memberIds: arrayUnion(collaboratorUid) });
  }

  async removeCollaborator(sessionId, collaboratorUid) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "sessions", sessionId), { memberIds: arrayRemove(collaboratorUid) });
  }

  async listDays(sessionId) {
    const db = getFirebaseDb();
    const snap = await getDocs(
      query(collection(db, "sessions", sessionId, "days"), orderBy("dayNumber", "asc"))
    );
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  // dayNumber auto-increments via a denormalized dayCount counter on the
  // parent session doc, read/written inside one transaction - avoids a race
  // between two simultaneous "add day" clicks (e.g. two open tabs).
  async addDay(sessionId, { date, agenda }) {
    const db = getFirebaseDb();
    const sessionRef = doc(db, "sessions", sessionId);
    const newDayRef = doc(collection(db, "sessions", sessionId, "days"));

    return runTransaction(db, async (tx) => {
      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session not found");

      const dayNumber = (sessionSnap.data().dayCount ?? 0) + 1;
      tx.update(sessionRef, { dayCount: dayNumber });
      tx.set(newDayRef, { dayNumber, date, agenda });

      return { id: newDayRef.id, dayNumber, date, agenda };
    });
  }

  async resumeLatestDay(sessionId) {
    const days = await this.listDays(sessionId);
    return days.length ? days[days.length - 1] : null;
  }

  async setAttendance(sessionId, dayId, delegateKey, status) {
    const db = getFirebaseDb();
    const ref = doc(db, "sessions", sessionId, "days", dayId, "attendance", delegateKey);
    await setDoc(ref, { status }, { merge: true });
  }

  async listAttendance(sessionId, dayId) {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "sessions", sessionId, "days", dayId, "attendance"));
    const map = {};
    snap.docs.forEach((docSnap) => {
      map[docSnap.id] = docSnap.data().status;
    });
    return map;
  }
}

const cloudSessionService = new CloudSessionService();
export default cloudSessionService;
