import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import Logo from "../components/Logo";
import AuthService from "../services/AuthService";
import CloudSessionService, { stableDelegateKey, dayNumberForSession } from "../services/CloudSessionService";
import ConferenceService from "../services/ConferenceService";

const PILL = "border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10";
const PILL_ACTIVE = "border border-white/40 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white transition";
const ROW = "flex w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10";
const PANEL = "border border-white/10 bg-[#111111] p-6";
const LABEL = "text-xs uppercase tracking-[0.22em] text-white/40";
const INPUT = "mt-3 w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none";

const ATTENDANCE_STATES = ["present", "absent", "present_and_voting"];

function nextAttendanceState(current) {
  const index = ATTENDANCE_STATES.indexOf(current ?? "absent");
  return ATTENDANCE_STATES[(index + 1) % ATTENDANCE_STATES.length];
}

export default function CloudSessionsPage() {
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authTab, setAuthTab] = useState("google");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [quickLoginUrl, setQuickLoginUrl] = useState(null);
  const [error, setError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCommitteeId, setNewCommitteeId] = useState(ConferenceService.getActiveCommitteeId() ?? "");

  const [attendance, setAttendance] = useState({});
  const [newCollaboratorUid, setNewCollaboratorUid] = useState("");
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState(null);

  useEffect(() => AuthService.subscribe(setUser), []);

  useEffect(() => {
    if (!AuthService.isConfigured()) return;
    AuthService.consumeQuickLoginParams().catch((err) => setError(err.message));
  }, []);

  // Panels that read `sessions`/`attendance` are only rendered while
  // `user`/`activeSessionId` are truthy (see JSX below), so stale data left
  // behind after logout/deselect never actually surfaces - no need to reset
  // it here, only to fetch when there's something to fetch.
  useEffect(() => {
    if (!user) return;
    CloudSessionService.listMySessions(user.uid).then(setSessions).catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!activeSessionId) return;
    CloudSessionService.listAttendance(activeSessionId).then(setAttendance).catch((err) => setError(err.message));
  }, [activeSessionId]);

  async function handleGoogleSignIn() {
    try {
      setError(null);
      await AuthService.signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEmailSubmit(mode) {
    try {
      setError(null);
      if (mode === "signup") {
        await AuthService.signUpWithEmail(email, password);
      } else {
        await AuthService.signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateQuickLogin() {
    try {
      setError(null);
      const url = await AuthService.createQuickLoginLink();
      setQuickLoginUrl(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateSession() {
    if (!newTitle.trim() || !user) return;
    try {
      setError(null);
      const id = await CloudSessionService.createSession({
        title: newTitle.trim(),
        committeeId: newCommitteeId.trim(),
        ownerId: user.uid,
      });
      setNewTitle("");
      setSessions(await CloudSessionService.listMySessions(user.uid));
      setActiveSessionId(id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCycleAttendance(delegateKey) {
    if (!activeSessionId || !user) return;
    const next = nextAttendanceState(attendance[delegateKey]);
    setAttendance((prev) => ({ ...prev, [delegateKey]: next }));
    try {
      await CloudSessionService.setAttendance(activeSessionId, delegateKey, next);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSession() {
    if (!pendingDeleteSessionId || !user) return;
    try {
      setError(null);
      await CloudSessionService.deleteSession(pendingDeleteSessionId);
      if (activeSessionId === pendingDeleteSessionId) {
        setActiveSessionId(null);
        setAttendance({});
      }
      setPendingDeleteSessionId(null);
      setSessions(await CloudSessionService.listMySessions(user.uid));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddCollaborator() {
    if (!activeSessionId || !newCollaboratorUid.trim()) return;
    try {
      setError(null);
      await CloudSessionService.addCollaborator(activeSessionId, newCollaboratorUid.trim());
      setNewCollaboratorUid("");
      setSessions(await CloudSessionService.listMySessions(user.uid));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveCollaborator(uid) {
    if (!activeSessionId) return;
    try {
      setError(null);
      await CloudSessionService.removeCollaborator(activeSessionId, uid);
      setSessions(await CloudSessionService.listMySessions(user.uid));
    } catch (err) {
      setError(err.message);
    }
  }

  const roster = ConferenceService.isLoaded() ? ConferenceService.getDelegates() : [];
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const isSessionOwner = activeSession && user && activeSession.ownerId === user.uid;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-3xl">

        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <Logo compact light />
            </Link>
            <span className="text-xs uppercase tracking-[0.18em] text-white/50">Cloud Sessions</span>
          </div>

          <Link to="/home" className={`flex items-center gap-2 ${PILL}`}>
            <ArrowLeft size={14} /> Back
          </Link>
        </header>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!AuthService.isConfigured() && (
          <div className={PANEL}>
            <p className={LABEL}>Cloud sessions unavailable</p>
            <p className="mt-2 text-sm text-white/45">Firebase isn't configured for this deployment.</p>
          </div>
        )}

        {AuthService.isConfigured() && !user && (
          <div className={PANEL}>
            <p className={LABEL}>Sign in</p>

            <div className="mt-4 flex gap-3">
              <button onClick={() => setAuthTab("google")} className={authTab === "google" ? PILL_ACTIVE : PILL}>Google</button>
              <button onClick={() => setAuthTab("email")} className={authTab === "email" ? PILL_ACTIVE : PILL}>Email</button>
              <button onClick={() => setAuthTab("qr")} className={authTab === "qr" ? PILL_ACTIVE : PILL}>QR Code</button>
            </div>

            {authTab === "google" && (
              <button onClick={handleGoogleSignIn} className={`mt-5 ${PILL}`}>
                Sign in with Google
              </button>
            )}

            {authTab === "email" && (
              <div className="mt-5">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
                <div className="mt-3 flex gap-3">
                  <button onClick={() => handleEmailSubmit("signin")} className={PILL}>Log In</button>
                  <button onClick={() => handleEmailSubmit("signup")} className={PILL}>Sign Up</button>
                </div>
              </div>
            )}

            {authTab === "qr" && (
              <div className="mt-5">
                <p className="text-sm text-white/45">
                  Generates a throwaway quick-login account. Scanning the code signs the scanning
                  device in directly &mdash; treat the code like a password and don't share it publicly.
                </p>
                <button onClick={handleGenerateQuickLogin} className={`mt-3 flex items-center gap-2 ${PILL}`}>
                  <QrCode size={14} /> Generate QR Code
                </button>
                {quickLoginUrl && (
                  <div className="mt-4 inline-block bg-white p-4">
                    <QRCodeSVG value={quickLoginUrl} size={180} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {user && (
          <>
            <div className={PANEL}>
              <p className={LABEL}>Your account</p>
              <p className="mt-2 text-sm text-white/45">
                Share your UID with a session owner so they can add you as a collaborator.
              </p>
              <p className="mt-3 break-all border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white/70">
                {user.uid}
              </p>
            </div>

            <div className={`mt-6 ${PANEL}`}>
              <p className={LABEL}>Sessions</p>

              <div className="mt-4 space-y-2">
                {sessions.map((session) => {
                  const dayNumber = dayNumberForSession(session);
                  return (
                    <div
                      key={session.id}
                      className={ROW + (activeSessionId === session.id ? " border-white/30 bg-white/10" : "")}
                    >
                      <button onClick={() => setActiveSessionId(session.id)} className="flex flex-1 items-center justify-between text-left">
                        <span className="font-medium">{session.title}</span>
                        <span className="shrink-0 whitespace-nowrap pl-4 text-xs text-white/40">
                          {session.committeeId}
                          {dayNumber ? ` · Day ${dayNumber}` : ""}
                        </span>
                      </button>
                      {user && session.ownerId === user.uid && (
                        <button
                          onClick={() => setPendingDeleteSessionId(session.id)}
                          aria-label={`Delete ${session.title}`}
                          className="ml-4 shrink-0 text-white/30 transition hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {sessions.length === 0 && <p className="text-sm text-white/40">No cloud sessions yet.</p>}
              </div>

              <div className="mt-5 flex gap-3">
                <input placeholder="Session title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none" />
                <input placeholder="Committee ID" value={newCommitteeId} onChange={(e) => setNewCommitteeId(e.target.value)} className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none" />
                <button onClick={handleCreateSession} className={PILL}>Create</button>
              </div>
            </div>

            {activeSessionId && isSessionOwner && (
              <div className={`mt-6 ${PANEL}`}>
                <p className={LABEL}>Collaborators</p>
                <p className="mt-2 text-sm text-white/45">
                  Co-chairs get full read/write on this session's attendance, but can't delete the session itself.
                </p>

                <div className="mt-4 space-y-2">
                  {(activeSession.memberIds ?? []).filter((uid) => uid !== activeSession.ownerId).map((uid) => (
                    <div key={uid} className={ROW}>
                      <span className="truncate font-mono text-xs text-white/70">{uid}</span>
                      <button onClick={() => handleRemoveCollaborator(uid)} className="shrink-0 pl-4 text-xs uppercase tracking-[0.16em] text-red-300 hover:text-red-200">
                        Remove
                      </button>
                    </div>
                  ))}
                  {(activeSession.memberIds ?? []).filter((uid) => uid !== activeSession.ownerId).length === 0 && (
                    <p className="text-sm text-white/40">No collaborators yet.</p>
                  )}
                </div>

                <div className="mt-5 flex gap-3">
                  <input
                    placeholder="Collaborator's Firebase UID"
                    value={newCollaboratorUid}
                    onChange={(e) => setNewCollaboratorUid(e.target.value)}
                    className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                  />
                  <button onClick={handleAddCollaborator} className={PILL}>Add</button>
                </div>
              </div>
            )}

            {activeSessionId && (
              <div className={`mt-6 ${PANEL}`}>
                <p className={LABEL}>Attendance</p>

                {roster.length === 0 && (
                  <p className="mt-3 text-sm text-white/40">
                    No committee roster loaded in this tab &mdash; upload a workbook on Home to see delegates here.
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {roster.map((delegate) => {
                    const key = stableDelegateKey(delegate.country);
                    const status = attendance[key] ?? "absent";
                    return (
                      <button key={key} onClick={() => handleCycleAttendance(key)} className={ROW}>
                        <span className="font-medium">{delegate.countryDisplay || delegate.country}</span>
                        <span className="shrink-0 whitespace-nowrap pl-4 text-xs uppercase tracking-[0.16em] text-white/40">
                          {status.replace(/_/g, " ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {pendingDeleteSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md border border-white/10 bg-[#111111] p-6">
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-white/50" />
              <h2 className="text-lg font-medium">Delete this session?</h2>
            </div>

            <p className="mt-4 text-sm text-white/60">
              This permanently deletes the session and all of its attendance data. This can't be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPendingDeleteSessionId(null)}
                className="flex-1 border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex-1 border border-white/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
