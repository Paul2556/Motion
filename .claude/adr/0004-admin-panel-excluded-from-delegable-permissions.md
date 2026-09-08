# Admin Panel stays owner-only, excluded from the delegable permissions system

`contributorPermissions/{uid}` (Firestore, self-read/Admin-SDK-write-only) lets an owner delegate
per-page access to contributors — `debug`, `refer`, `app` — via a "Permissions" tab in
`AdminPanelPage`.

**Decision:** the Admin Panel itself is deliberately *not* part of this delegable system. Access to
`AdminPanelPage` stays gated on `isOwner` alone, checked against a hardcoded `OWNER_EMAILS` list in
`requireOwner.js` — it cannot be granted to a contributor through the Permissions tab or any other
mechanism.

**Why:** this decision exists because the opposite was, briefly, the actual bug (SEC-008 in
`.claude/issues.md`): `AUTHORIZED_EMAILS` had `CONTRIBUTOR_EMAILS` spread into it, so granting
someone `/debug` access silently granted full admin API access too — list/create/password-reset/
delete on every account. The fix separated the two systems entirely rather than adding a
finer-grained permission flag, because real admin access (account takeover surface) is
categorically higher-stakes than page visibility, and a flag-based fix would leave the door open
for a future "just add one more permission" change to accidentally recreate the same collapse. A
future engineer who wants to delegate any admin capability needs to treat that as a new,
explicitly-scoped decision — not an extension of the existing Permissions tab.
