import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Send, Trash2, Upload, UserPlus } from "lucide-react";
import DebugTopBar from "../components/DebugTopBar";
import AuthService from "../services/AuthService";
import { isOwner } from "../services/ownerAccess";
import { getFirebaseAuth } from "../firebase";
import { ANNOUNCEMENT_TEMPLATES } from "../data/announcementTemplates";

// Client-side convenience gate only; the real boundary is server-side, where
// every api/admin/* endpoint verifies the caller's ID token. Deliberately not
// routed through contributorPermissions, since admin access is non-delegable.

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
  // `code` is a standardized, safe-to-display error identifier (see
  // api/admin/_lib/mapAuthError.js); `message` only appears for the rare
  // handwritten UI copy (e.g. permissions.js's "never signed in" message),
  // never a raw SDK exception.
  if (!res.ok) throw new Error(data.message ?? data.code ?? data.error ?? "Request failed");
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

const PERMISSION_KEYS = ["debug", "refer", "app"];
const PERMISSION_LABELS = { debug: "Debug", refer: "Refer", app: "App" };

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => AuthService.getCurrentUser());
  const [authReady, setAuthReady] = useState(() => AuthService.isReady());

  useEffect(() => AuthService.subscribe((nextUser) => {
    setUser(nextUser);
    setAuthReady(AuthService.isReady());
  }), []);

  const isAuthorized = isOwner(user);

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

  const [tab, setTab] = useState("users");
  const [contributors, setContributors] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState(null);
  const [newContributorEmail, setNewContributorEmail] = useState("");
  const [addingContributor, setAddingContributor] = useState(false);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState(null);

  const [subscribers, setSubscribers] = useState([]);
  const [subscriberTotal, setSubscriberTotal] = useState(0);
  const [unsubscribedCount, setUnsubscribedCount] = useState(0);
  const [subscribersLoading, setSubscribersLoading] = useState(true);
  const [subscribersError, setSubscribersError] = useState(null);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await callAdmin("users", { method: "GET" });
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetches inline so setState only happens in promise callbacks, never
  // synchronously in the effect body. loadUsers stays for the Refresh button
  // and post-mutation reloads, which run from event handlers.
  useEffect(() => {
    if (!isAuthorized) return;
    callAdmin("users", { method: "GET" })
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthorized]);

  async function loadPermissions() {
    setPermissionsLoading(true);
    setPermissionsError(null);
    try {
      const data = await callAdmin("permissions", { method: "GET" });
      setContributors(data.contributors);
    } catch (err) {
      setPermissionsError(err.message);
    } finally {
      setPermissionsLoading(false);
    }
  }

  // Same inline-fetch-on-mount pattern as the users list above.
  useEffect(() => {
    if (!isAuthorized) return;
    callAdmin("permissions", { method: "GET" })
      .then((data) => setContributors(data.contributors))
      .catch((err) => setPermissionsError(err.message))
      .finally(() => setPermissionsLoading(false));
  }, [isAuthorized]);

  async function loadSubscribers() {
    setSubscribersLoading(true);
    setSubscribersError(null);
    try {
      const data = await callAdmin("announcements", { method: "GET" });
      setSubscribers(data.subscribers);
      setSubscriberTotal(data.total);
      setUnsubscribedCount(data.unsubscribedCount);
    } catch (err) {
      setSubscribersError(err.message);
    } finally {
      setSubscribersLoading(false);
    }
  }

  // Same inline-fetch-on-mount pattern as users/permissions above.
  useEffect(() => {
    if (!isAuthorized) return;
    callAdmin("announcements", { method: "GET" })
      .then((data) => {
        setSubscribers(data.subscribers);
        setSubscriberTotal(data.total);
        setUnsubscribedCount(data.unsubscribedCount);
      })
      .catch((err) => setSubscribersError(err.message))
      .finally(() => setSubscribersLoading(false));
  }, [isAuthorized]);

  async function handleImport(event) {
    event.preventDefault();
    const emails = importText.split(/[\n,]/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) return;

    setImporting(true);
    setSubscribersError(null);
    setImportResult(null);
    try {
      const data = await callAdmin("announcements", {
        method: "POST",
        body: JSON.stringify({ action: "import", emails }),
      });
      setImportResult(data);
      setImportText("");
      await loadSubscribers();
    } catch (err) {
      setSubscribersError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function applyTemplate(template) {
    setSubject(template.subject);
    setBody(template.body);
  }

  async function handleSend() {
    setSending(true);
    setSubscribersError(null);
    setSendResult(null);
    try {
      const data = await callAdmin("announcements", {
        method: "POST",
        body: JSON.stringify({ action: "send", subject, body }),
      });
      setSendResult(data);
      setConfirmSend(false);
    } catch (err) {
      setSubscribersError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleAddContributor(event) {
    event.preventDefault();
    if (!newContributorEmail.trim()) return;

    setAddingContributor(true);
    setPermissionsError(null);
    try {
      // debug-only by default - the owner can widen access afterward from
      // the list below.
      await callAdmin("permissions", {
        method: "POST",
        body: JSON.stringify({ action: "set", email: newContributorEmail.trim(), debug: true, refer: false, app: false }),
      });
      setNewContributorEmail("");
      await loadPermissions();
    } catch (err) {
      setPermissionsError(err.message);
    } finally {
      setAddingContributor(false);
    }
  }

  async function handleTogglePermission(contributor, key) {
    setPermissionsError(null);
    try {
      await callAdmin("permissions", {
        method: "POST",
        body: JSON.stringify({ action: "set", email: contributor.email, [key]: !contributor[key] }),
      });
      await loadPermissions();
    } catch (err) {
      setPermissionsError(err.message);
    }
  }

  async function handleRemoveContributor(uid) {
    setPermissionsError(null);
    try {
      await callAdmin("permissions", { method: "POST", body: JSON.stringify({ action: "remove", uid }) });
      setConfirmRemoveUid(null);
      await loadPermissions();
    } catch (err) {
      setPermissionsError(err.message);
    }
  }

  async function toggleDisabled(target) {
    setError(null);
    try {
      await callAdmin("users", {
        method: "POST",
        body: JSON.stringify({ action: "update", uid: target.uid, disabled: !target.disabled }),
      });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(uid) {
    setError(null);
    try {
      await callAdmin("users", { method: "POST", body: JSON.stringify({ action: "delete", uid }) });
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
      await callAdmin("users", {
        method: "POST",
        body: JSON.stringify({ action: "create", email: newEmail.trim(), password: newPassword }),
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
    <div className="app-shell min-h-screen bg-[var(--app-bg)] p-8 text-[var(--app-text)]">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <DebugTopBar />
          <button
            onClick={tab === "users" ? loadUsers : tab === "permissions" ? loadPermissions : loadSubscribers}
            aria-label="Refresh"
            className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
          >
            <RefreshCw size={14} className={(tab === "users" ? loading : tab === "permissions" ? permissionsLoading : subscribersLoading) ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <h1 className="mt-6 text-3xl font-semibold">Admin Panel</h1>
        <p className="mt-2 text-[var(--app-text-muted)]">
          {tab === "users"
            ? "Firebase Auth accounts - list, disable/enable, delete."
            : tab === "permissions"
            ? "Contributor page access - Debug/Refer/App are granted individually; admin access always stays owner-only."
            : "Compose and send an email to the waitlist from hello@motionmun.com."}
        </p>

        <div className="mt-6 flex gap-2 border-b border-[var(--app-border)]">
          {[["users", "Users"], ["permissions", "Permissions"], ["announcements", "Announcements"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-xs uppercase tracking-[0.16em] transition ${
                tab === key ? "border-b-2 border-[var(--app-text)] text-[var(--app-text)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && error && (
          <p className="mt-4 border border-[rgba(var(--danger-rgb),0.4)] bg-[rgba(var(--danger-rgb),0.08)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {tab === "permissions" && permissionsError && (
          <p className="mt-4 border border-[rgba(var(--danger-rgb),0.4)] bg-[rgba(var(--danger-rgb),0.08)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {permissionsError}
          </p>
        )}

        {tab === "announcements" && subscribersError && (
          <p className="mt-4 border border-[rgba(var(--danger-rgb),0.4)] bg-[rgba(var(--danger-rgb),0.08)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {subscribersError}
          </p>
        )}

        {tab === "users" ? (
        <>
        <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-3 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <label className="flex-1 min-w-[180px]">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
            />
          </label>
          <label className="flex-1 min-w-[180px]">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Password</span>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip-active)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text)] transition hover:bg-[var(--app-chip-active-hover)] disabled:opacity-50"
          >
            <UserPlus size={14} /> Add user
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {users.map((u) => (
            <div key={u.uid} className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-[var(--app-text-secondary)]">{u.email ?? u.uid}</p>
                    {u.isQuickLogin && (
                      <span className="shrink-0 border border-[var(--app-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
                        Quick login
                      </span>
                    )}
                    {u.disabled && (
                      <span className="shrink-0 border border-[var(--danger)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--danger)]">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">
                    Created {formatDate(u.creationTime)} · Last sign-in {formatDate(u.lastSignInTime)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleDisabled(u)}
                    className="border border-[var(--app-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
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
                        className="text-xs uppercase tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
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
            <div className="border border-dashed border-[var(--app-border)] py-10 text-center text-sm text-[var(--app-text-faint)]">
              No users found.
            </div>
          )}
        </div>
        </>
        ) : tab === "permissions" ? (
        <>
        <form onSubmit={handleAddContributor} className="mt-6 flex flex-wrap items-end gap-3 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <label className="flex-1 min-w-[220px]">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Email</span>
            <input
              type="email"
              value={newContributorEmail}
              onChange={(e) => setNewContributorEmail(e.target.value)}
              placeholder="They must have signed in at least once"
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)] placeholder:text-[var(--app-text-faint)]"
            />
          </label>
          <button
            type="submit"
            disabled={addingContributor}
            className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip-active)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text)] transition hover:bg-[var(--app-chip-active-hover)] disabled:opacity-50"
          >
            <UserPlus size={14} /> Add contributor (Debug only)
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {contributors.map((c) => (
            <div key={c.uid} className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-[var(--app-text-secondary)]">{c.email ?? c.uid}</p>

                <div className="flex shrink-0 items-center gap-4">
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-secondary)]">
                      <input
                        type="checkbox"
                        checked={Boolean(c[key])}
                        onChange={() => handleTogglePermission(c, key)}
                        className="accent-white"
                      />
                      {PERMISSION_LABELS[key]}
                    </label>
                  ))}

                  {confirmRemoveUid === c.uid ? (
                    <>
                      <button
                        onClick={() => handleRemoveContributor(c.uid)}
                        className="text-xs uppercase tracking-[0.14em] text-[var(--danger)] hover:opacity-80"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRemoveUid(null)}
                        className="text-xs uppercase tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveUid(c.uid)}
                      aria-label={`Remove ${c.email ?? c.uid}`}
                      className="border border-[rgba(var(--danger-rgb),0.3)] p-2 text-[var(--danger)] transition hover:bg-[rgba(var(--danger-rgb),0.1)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!permissionsLoading && contributors.length === 0 && (
            <div className="border border-dashed border-[var(--app-border)] py-10 text-center text-sm text-[var(--app-text-faint)]">
              No contributors yet.
            </div>
          )}
        </div>
        </>
        ) : (
        <>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--app-text-secondary)]">
          <p><span className="text-[var(--app-text)]">{subscriberTotal}</span> waitlist subscribers</p>
          <p><span className="text-[var(--app-text)]">{unsubscribedCount}</span> unsubscribed</p>
        </div>

        <form onSubmit={handleImport} className="mt-4 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
            Import emails (comma or newline-separated)
          </span>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder="One-time backfill of the existing waitlist"
            className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)] placeholder:text-[var(--app-text-faint)]"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={importing}
              className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip-active)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text)] transition hover:bg-[var(--app-chip-active-hover)] disabled:opacity-50"
            >
              <Upload size={14} /> Import
            </button>
            {importResult && (
              <p className="text-xs text-[var(--app-text-muted)]">
                Imported {importResult.imported}, skipped {importResult.skipped} (already on the list).
              </p>
            )}
          </div>
        </form>

        {/* Audience is waitlist-only for now; a selector belongs here once
            announcements can also target every signed-up Firebase user. */}
        <div className="mt-6 border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Audience: Waitlist</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {ANNOUNCEMENT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(t)}
                className="border border-[var(--app-border)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--app-text-secondary)] transition hover:bg-[var(--app-chip-active)]"
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--app-text-muted)]">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1.5 w-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-border-focus)]"
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            {confirmSend ? (
              <>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 border border-[rgba(var(--danger-rgb),0.4)] bg-[rgba(var(--danger-rgb),0.08)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--danger)] transition hover:bg-[rgba(var(--danger-rgb),0.15)] disabled:opacity-50"
                >
                  <Send size={14} /> Confirm: send to {subscriberTotal - unsubscribedCount} people
                </button>
                <button
                  onClick={() => setConfirmSend(false)}
                  className="text-xs uppercase tracking-[0.14em] text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmSend(true)}
                disabled={!subject.trim() || !body.trim()}
                className="flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-chip-active)] px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--app-text)] transition hover:bg-[var(--app-chip-active-hover)] disabled:opacity-50"
              >
                <Send size={14} /> Send
              </button>
            )}
            {sendResult && (
              <p className="text-xs text-[var(--app-text-muted)]">
                Sent {sendResult.sent}{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ""}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {subscribers.map((s) => (
            <div key={s.email} className="border border-[var(--app-border)] bg-[var(--app-chip)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-[var(--app-text-secondary)]">{s.email}</p>
                    <span className="shrink-0 border border-[var(--app-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--app-text-muted)]">
                      {s.source}
                    </span>
                    {s.unsubscribed && (
                      <span className="shrink-0 border border-[var(--danger)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--danger)]">
                        Unsubscribed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--app-text-faint)]">Added {formatDate(s.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}

          {!subscribersLoading && subscribers.length === 0 && (
            <div className="border border-dashed border-[var(--app-border)] py-10 text-center text-sm text-[var(--app-text-faint)]">
              No subscribers yet.
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
