import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
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

// Formats a Date as its calendar date (Y-M-D) inside a given IANA timezone -
// used instead of raw offset math since it sidesteps DST entirely: two
// timestamps are "the same calendar day in that timezone" iff this string
// matches, no matter what the zone's UTC offset is on either date.
function calendarDateInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

// Day count is derived, not stored - it's just "how many local midnights
// have passed since this session was created", computed fresh whenever it's
// displayed rather than incremented by any button or write.
export function dayNumberForSession(session) {
  if (!session?.createdAt?.toDate || !session.timezone) return null;

  const startDateStr = calendarDateInZone(session.createdAt.toDate(), session.timezone);
  const nowDateStr = calendarDateInZone(new Date(), session.timezone);
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const now = new Date(`${nowDateStr}T00:00:00Z`);

  return Math.round((now - start) / 86400000) + 1;
}

class CloudSessionService {
  // memberIds always starts as just [ownerId] - collaborators get appended
  // via addCollaborator. firestore.rules keys every access check (including
  // attendance, via one get() on this doc) off this single list, so an
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
      // Captured once at creation - the day count is computed against this
      // fixed zone for the session's whole lifetime, not whatever zone
      // whoever's viewing happens to be in later.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return ref.id;
  }

  // Firestore doesn't cascade-delete subcollections, so attendance docs are
  // batch-deleted first - otherwise they'd be orphaned (inert, since
  // isSessionMember's get() on the now-gone parent would fail either way,
  // but there's no reason to leave dead docs behind when it's this cheap).
  async deleteSession(sessionId) {
    const db = getFirebaseDb();
    const attendanceSnap = await getDocs(collection(db, "sessions", sessionId, "attendance"));
    const batch = writeBatch(db);
    attendanceSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    batch.delete(doc(db, "sessions", sessionId));
    await batch.commit();
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

  async setAttendance(sessionId, delegateKey, status) {
    const db = getFirebaseDb();
    const ref = doc(db, "sessions", sessionId, "attendance", delegateKey);
    await setDoc(ref, { status }, { merge: true });
  }

  async listAttendance(sessionId) {
    const db = getFirebaseDb();
    const snap = await getDocs(collection(db, "sessions", sessionId, "attendance"));
    const map = {};
    snap.docs.forEach((docSnap) => {
      map[docSnap.id] = docSnap.data().status;
    });
    return map;
  }
}

const cloudSessionService = new CloudSessionService();
export default cloudSessionService;
