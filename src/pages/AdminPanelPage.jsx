import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, Trash2, UserPlus } from "lucide-react";
import Logo from "../components/Logo";
import AuthService from "../services/AuthService";
import { isAuthorizedUser } from "../services/ownerAccess";
import { getFirebaseAuth } from "../firebase";

// Same gate as DebugPage.jsx/ReferPage.jsx (see ownerAccess.js) - client-side
// convenience redirect, not the real security boundary. That boundary is
// server-side: every api/admin/* endpoint independently verifies the
// caller's Firebase ID token against the same allowlist (see
// api/admin/_lib/requireOwner.js) - this page's own gate just spares an
// unauthorized visitor from seeing the UI at all before their first request
// would get rejected anyway.

async function callAdmin(path, options = {}) {
  const token = await getFirebaseAuth().currentUser.getIdToken();
  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Request failed");
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());

  useEffect(() => AuthService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthReady(AuthService.isReady());
  }), []);

  const isAuthorized = isAuthorizedUser(user);

  useEffect(() => {
    if (!authReady || isAuthorized) return;

    if (window.location.hostname === "debug.motionmun.com") {
      window.location.replace("https://app.motionmun.com/");
    } else {
      navigate("/home");
    }
  }, [authReady, isAuthorized, navigate]);

  const [users, setUsers] = useState([]);
  // Starts true (rather than being set synchronously in the mount effect
  // below, which the "no setState directly in an effect body" lint rule
  // disallows) - the initial fetch's .finally() is what turns it back off.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await callAdmin("users/list", { method: "GET" });
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetches inline (setState only inside the promise chain's callbacks,
  // never synchronously in the effect body) rather than calling loadUsers
  // directly - same pattern CloudSessionsPage.jsx uses for its own mount
  // fetches. loadUsers itself stays for the Refresh button and post-mutation
  // reloads, which run from event handlers, not an effect.
  useEffect(() => {
    if (!isAuthorized) return;
    callAdmin("users/list", { method: "GET" })
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthorized]);

  async function toggleDisabled(target) {
    setError(null);
    try {
      await callAdmin("users/update", {
        method: "POST",
        body: JSON.stringify({ uid: target.uid, disabled: !target.disabled }),
      });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(uid) {
    setError(null);
    try {
      await callAdmin("users/delete", { method: "POST", body: JSON.stringify({ uid }) });
      setConfirmDeleteUid(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (!newEmail.trim() || !newPassword) return;

    setCreating(true);
    setError(null);
    try {
      await callAdmin("users/create", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword }),
      });
      setNewEmail("");
      setNewPassword("");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!authReady || !isAuthorized) return null;

  return (
    <div className="app-shell min-h-screen bg-[#0d0d0d] p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo compact light />
          </Link>
          <button
            onClick={loadUsers}
            aria-label="Refresh"
            className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <h1 className="mt-6 text-3xl font-semibold">Admin Panel</h1>
        <p className="mt-2 text-white/40">Firebase Auth accounts - list, disable/enable, delete.</p>

        {error && (
          <p className="mt-4 border border-[rgba(var(--danger-rgb),0.4)] bg-[rgba(var(--danger-rgb),0.08)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-3 border border-white/10 bg-[#111111] p-6">
          <label className="flex-1 min-w-[180px]">
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1.5 w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
            />
          </label>
          <label className="flex-1 min-w-[180px]">
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/40">Password</span>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 border border-white/10 bg-white/10 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <UserPlus size={14} /> Add user
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {users.map((u) => (
            <div key={u.uid} className="border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-white/80">{u.email ?? u.uid}</p>
                    {u.isQuickLogin && (
                      <span className="shrink-0 border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/40">
                        Quick login
                      </span>
                    )}
                    {u.disabled && (
                      <span className="shrink-0 border border-[var(--danger)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--danger)]">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/30">
                    Created {formatDate(u.creationTime)} · Last sign-in {formatDate(u.lastSignInTime)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleDisabled(u)}
                    className="border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/60 transition hover:bg-white/10"
                  >
                    {u.disabled ? "Enable" : "Disable"}
                  </button>

                  {confirmDeleteUid === u.uid ? (
                    <>
                      <button
                        onClick={() => handleDelete(u.uid)}
                        className="text-xs uppercase tracking-[0.14em] text-[var(--danger)] hover:opacity-80"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUid(null)}
                        className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white/60"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteUid(u.uid)}
                      aria-label={`Delete ${u.email ?? u.uid}`}
                      className="border border-[rgba(var(--danger-rgb),0.3)] p-2 text-[var(--danger)] transition hover:bg-[rgba(var(--danger-rgb),0.1)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!loading && users.length === 0 && (
            <div className="border border-dashed border-white/10 py-10 text-center text-sm text-white/30">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
