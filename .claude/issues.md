# Issues

Findings from this repo's review subagents (`security-reviewer`, `design-reviewer`,
`docs-sync-reviewer`, `verifier`), plus a standalone automated accessibility sweep. Maintained by
the calling session — the four subagents are read-only and never write here themselves. Update
status as items get fixed, and don't hand out a new ID for a re-finding of something already
tracked below; reference the existing ID (`SEC-NNN` / `DES-NNN` / `ACC-NNN` / `DOC-NNN` /
`VER-NNN`).

Personal email addresses are redacted from this file (see `SEC-001`) since `.claude/` is tracked
in git and this repo is public — keep it that way for anything added here in the future.

## Security

Findings from `security-reviewer` sweeps.

Last full sweep: 2026-08-16. All findings triaged and closed out on 2026-08-25 ahead of making the
repo public — see each entry for what was fixed, made moot by the source-request removal, or
deliberately deferred.

### Server

| ID | Severity | Status | Location |
|---|---|---|---|
| SEC-001 | Critical | **Fixed** (2026-08-16) | `api/admin/_lib/requireOwner.js:18` |
| SEC-002 | Medium | **Fixed** (2026-08-16) | `api/source/_lib/rateLimit.js`, `api/source/_lib/clientIp.js` |
| SEC-003 | Medium | **Fixed** (2026-08-16) | `api/waitlist/welcome.js` |
| SEC-004 | Medium | **Moot** (2026-08-25) | `api/discord/interactions.js` (file deleted) |
| SEC-005 | Low | **Fixed** (2026-08-25) | `api/admin/users.js`, `api/admin/permissions.js` |
| SEC-006 | Low | **Moot** (2026-08-25) | `api/source/request.js` (file deleted) |
| SEC-007 | Low | **Moot** (2026-08-25) | `api/discord/interactions.js` (file deleted) |

**SEC-001 — Admin account takeover.** `requireOwner` authorized purely on the ID token's `email`
claim, never checking `email_verified` or sign-in provider. Since email/password self-signup is
public on `/cloud`, anyone could sign up with an allowlisted owner email and gain full admin API
access (list/create/password-reset/delete every account). Confirmed live: `[owner-email-A]`
was unregistered in Firebase Auth (open to claim) and `[owner-email-B]` was registered via
unverified password auth. **Fix applied:** now requires `sign_in_provider === "google.com"` and
`email_verified === true` before the allowlist check. Follow-up still open: register
`[owner-email-A]` via Google sign-in so it's usable as an owner login again.

**SEC-002 — Spoofable rate-limit key.** `rateLimit.js` keys on the left-most (client-supplied)
`X-Forwarded-For` entry across `api/source/request.js`, `api/feedback/submit.js`,
`api/waitlist/welcome.js` — trivially bypassed by sending a fresh fake IP per request; also a `/`
in the header can 500 or spam junk Firestore docs. **Fix applied:** new `api/source/_lib/clientIp.js`
prefers `x-real-ip`, else the right-most `X-Forwarded-For` entry; `rateLimit.js` now hashes the key
(sha256) before using it as the Firestore doc ID, so a malformed/injected key can no longer hit the
wrong path or 500.

**SEC-003 — Open arbitrary-recipient email sender.** `api/waitlist/welcome.js` sends real branded
email to any address a caller supplies — no honeypot, no proof of ownership. Combined with SEC-002
this is a mail-bomb / sender-reputation risk. **Fix applied:** added the same honeypot pattern as
`request.js`/`submit.js` (client-side in `LandingPage.jsx` and server-side in `welcome.js`), plus a
per-destination-address 24h send cooldown (`waitlistSends/{sha256(email)}`) that caps mail-bomb
impact even under IP rotation. **Residual scope (not fixed):** the originally-suggested signed
continuation token from the waitlist write itself would require editing the external Google Apps
Script, which lives outside this repo.

**SEC-004 — Discord approval fail-open.** **Moot (2026-08-25):** `api/discord/interactions.js` was
deleted wholesale when the source-request flow was retired (the repo is public on GitHub now, so
there's nothing to gate). The vulnerable code no longer exists.

**SEC-005 — Verbose admin error responses.** Raw Firebase Admin SDK `error.message` returned to
the client from `api/admin/*`. **Fix applied:** new `api/admin/_lib/mapAuthError.js` maps the SDK's
stable `error.code` values to a small set of standardized, safe-to-display codes (`invalid_email`,
`email_already_exists`, …), falling back to `unknown_error`. Both `users.js` and `permissions.js`
now `console.error` the full detail server-side and return `{ error, code }` instead of the raw
message. `AdminPanelPage.jsx`'s shared fetch helper prefers `code`, so the UI still shows something
specific rather than a vague "create failed".

**SEC-006 — Unbounded field lengths.** **Moot (2026-08-25):** `api/source/request.js` was deleted
with the rest of the source-request flow.

**SEC-007 — Discord interaction replay.** **Moot (2026-08-25):** `api/discord/interactions.js` was
deleted with the rest of the source-request flow.

### Boundary (client/server mismatch)

| ID | Severity | Status | Location |
|---|---|---|---|
| SEC-008 | Medium | **Fixed** (2026-08-16) | `src/services/ownerAccess.js` |
| SEC-009 | Medium | **Fixed** (2026-08-25) | `src/services/AuthService.js` |
| SEC-010 | Low | **Fixed** (2026-08-25) | `src/App.jsx`, `src/hosts.js` |
| SEC-011 | Low | **Fixed** (2026-08-25) | `firestore.rules` |

**SEC-008 — Shared owner/contributor allowlist.** `AUTHORIZED_EMAILS` (imported server-side by
`requireOwner.js`) had `CONTRIBUTOR_EMAILS` spread into it — adding someone to see `/debug`
silently granted them admin API access too. **Fix applied:** `requireOwner.js` now checks only the
hardcoded `OWNER_EMAILS` (real admin access stays non-delegable, on purpose). Contributor access to
`/debug`, `/debug/refer`, and `app.motionmun.com` is now managed per-page via a new
`contributorPermissions/{uid}` Firestore collection (self-read, Admin-SDK-write-only) and a new
"Permissions" tab in `AdminPanelPage.jsx` (`api/admin/permissions/{list,set,remove}.js`) — new
contributors default to `{ debug: true, refer: false, app: false }`. The Admin Panel itself is
deliberately *not* part of this delegable system; it stays gated on `isOwner` alone.

**SEC-009 — Quick-login password in URL.** `createQuickLoginLink` put a live password in a query
string, which reaches Vercel access logs, `@vercel/analytics`, and browser history. **Fix applied:**
both `createQuickLoginLink` and `consumeQuickLoginParams` now use the URL **fragment**
(`/cloud#qrEmail=…&qrPass=…`) instead. A fragment is never sent to any server, never appears in a
`Referer` header, and isn't part of what `@vercel/analytics` tracks (pathname + search only), so no
separate `beforeSend` filter is needed. Residual, unchanged by design: the credential is still a
reusable bearer secret for whoever can see the literal URL/QR image — making it single-use was left
out of scope (documented tradeoff for the "hand the session to a second screen" flow).

**SEC-010 — Unrecognized hostnames skip OwnerGate.** `AllRoutes` (the fallback for unknown
hostnames — preview URLs, `*.vercel.app`, bare IPs) mounted without `OwnerGate`, exposing the full
app + `/feedback` on any preview deployment. **Fix applied:** new `isLocalDevHost()` in
`src/hosts.js` (localhost + fully-anchored private IPv4 ranges); `App.jsx` now mounts the bare
fallback only for those, and wraps everything else in `OwnerGate`. The IP regex is anchored at both
ends specifically so an attacker-registered `127.0.0.1.evil.com` can't match a prefix-only pattern
and skip the gate.

**SEC-011 — Loose Cloud Session create rule.** `firestore.rules` let a creator set `memberIds` to
include an arbitrary victim uid at creation time, planting an attacker-controlled session in the
victim's `/cloud` list. **Fix applied:** the create rule now requires
`request.resource.data.memberIds == [request.auth.uid]`. No separate accept step was needed —
`CloudSessionService.createSession` already only ever writes `memberIds: [ownerId]`, and
collaborators are added afterward through the (already owner-gated) update rule.

### Client

| ID | Severity | Status | Location |
|---|---|---|---|
| SEC-012 | Low | **Won't fix** (2026-08-25) | `src/services/ConferenceService.js:28-50` |
| SEC-013 | Low | **Partially fixed** (2026-08-25) | `vercel.json` |
| SEC-014 | Low | **Fixed** (2026-08-25) | `package.json` (`npm audit`) |
| SEC-015 | Low | **Fixed** (2026-08-25) | `src/pages/LandingPage.jsx`, `api/waitlist/welcome.js` |

**SEC-012 — PII persisted despite "in-memory only" claim.** Full parsed conference (names,
emails, chair contacts) is serialized to `sessionStorage`. **Won't fix (2026-08-25, product
decision):** surviving a page reload with the roster intact is a deliberate feature, and the
landing page's FAQ already describes the guarantee accurately ("No, at least not fully… a loaded
conference lives only in your browser tab for that session") rather than claiming absolute
zero-persistence. Revisit if the copy ever hardens into an unqualified promise.

**SEC-013 — No security headers.** `vercel.json` had no CSP, `Referrer-Policy`, `X-Frame-Options`,
or `X-Content-Type-Options`. **Partially fixed:** added `Referrer-Policy:
strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
**CSP deliberately deferred** — the app loads from Firebase, Google Fonts, and Vercel
Analytics/Speed Insights, and getting a policy right without silently breaking one of them needs
live browser verification against a real deploy (there's no test suite to catch a regression).

**SEC-014 — npm audit: 13 vulns (6 high).** **Fixed:** `npm audit fix` (no `--force`) resolved all
6 high-severity advisories including `react-router`, `postcss`, `nanoid`, `brace-expansion`, and
`fast-xml-parser` — all patch/minor bumps within existing semver ranges, no `package.json` changes.
7 moderate remain, all in the `firebase-admin` → `@google-cloud/storage` → `teeny-request` → `uuid`
chain, which only `--force` (a breaking major upgrade) would touch; server-side only. Revisit when
those packages ship a non-breaking fix.

**SEC-015 — Unauthenticated waitlist Apps Script endpoint.** Hardcoded `/exec` URL in the bundle
accepted unauthenticated POSTs — anyone could inject fake rows into the waitlist sheet. **Fix
applied:** the Apps Script call moved server-side into `api/waitlist/welcome.js`, reading the URL
from a new `WAITLIST_SHEET_WEBHOOK_URL` env var; `LandingPage.jsx` now makes one call to that
endpoint (which already has the honeypot + IP rate limit + per-address cooldown) instead of two,
and no longer contains the webhook URL at all. **Deployment dependency:**
`WAITLIST_SHEET_WEBHOOK_URL` must be set in Vercel (Production + Preview) or signups fail with
`sheet_not_configured`.

### Needs a human (can't be verified from a read-only sweep)

- Deployed-vs-repo `firestore.rules` drift — no read-only Firebase CLI command exists for this;
  check via Firebase Console or Firebase Rules API. **Now also required:** SEC-011's tightened
  `create` rule has to actually be deployed (`firebase deploy --only firestore:rules`) — editing
  the file in this repo does not push it. Test it in the Rules Playground first: a bad rule here
  silently breaks all Cloud Session creation.
- `WAITLIST_SHEET_WEBHOOK_URL` must be added to Vercel env (Production + Preview) for SEC-015 —
  value is the Apps Script `/exec` URL previously hardcoded in `LandingPage.jsx` (now in
  `.env.local` for dev). Without it, waitlist signups return `sheet_not_configured`.
- Firebase Console → Authentication → Settings → confirm "one account per email" is enabled.

## Design

Findings from `design-reviewer` sweeps — visual alignment/consistency issues and brand-identity
deviations, graded against `.claude/brandIdentity.md`.

Last full sweep: 2026-08-16. Covered LandingPage plus every `app-shell` page; both theme systems
checked. LandingPage itself: no issues found (accent/logo/tagline usage all verified correct,
including the dark-mode double-invert cancellation for `MotionInputDemo`'s functional highlights).

| ID | Severity | Status | Location |
|---|---|---|---|
| DES-001 | High | **Fixed** (2026-08-16) | `src/components/NoCommitteeModal.jsx` (used by SessionPage, MotionPage, RollCallPage, GeneralVotingPage, StatsPage) |
| DES-002 | Medium | **Fixed** (2026-08-16) | `HomePage.jsx:149` vs. six other app-shell page headers |
| DES-003 | Low | **Partially fixed** (2026-08-16) | Page-gutter padding — 4 different schemes across pages |
| DES-004 | Low | Open — needs a product decision, not a code fix | Brand accent brown nearly absent outside marketing/MotionInput |
| DES-005 | Low | Open | Dot next to the Motion tab in the preview inside the landingPage doesn't render due to the css not accessable |

**DES-001 — `NoCommitteeModal` ignores the app theme entirely.** When no committee is loaded, five
pages (`SessionPage`/`MotionPage`/`RollCallPage`/`GeneralVotingPage`/`StatsPage`) render the modal
as their *entire* output with no `.app-shell` wrapper ever mounting. Confirmed live: `/motion`
renders byte-for-byte identical under `app-theme=light` vs. `dark` — always stuck on the dark
default, since the light-mode CSS selector requires a `.app-shell` to match against. **Fix
applied:** the modal's own root now carries `.app-shell`, so it picks up the theme's `invert(1)`
and CSS vars regardless of which page rendered it.

**DES-002 — HomePage's header doesn't match the other six pages.** HomePage used a bordered card
(`border border-white/10 bg-[#111111] p-6`) for logo+status; every other app-shell page uses a
bare `<header>` with no border/background/padding for the same role. **Fix applied:** conformed
HomePage to the shared bare-header convention (the lower-risk single-file fix, rather than
restyling the other six pages to match the outlier).

**DES-003 — Four different outer page-gutter schemes** across pages with no shared source (Home:
`px-6 py-8`; nine pages: `p-8`; three pages: responsive `px-6 py-12 sm:px-8 sm:py-16`; SessionPage:
its own responsive scale). **Partially fixed:** HomePage's outer gutter now matches the 9-page
`p-8` convention it structurally belongs to (folded into the DES-002 fix). Left alone on purpose:
SessionPage's scale (documented reason — calibrated to its `h-screen`/`overflow-hidden` layout)
and the 3-page responsive scheme (Feedback/License/SourceRequest are reachable in contexts without
this app's desktop-only disclaimer, so responsive padding there may be intentional, not drift) —
unifying those needs a human call, not a blind repaint across files that can't be visually
verified here.

**DES-004 — Brand accent brown barely appears outside LandingPage/MotionInput.** Every card
border/button/pill on the actual working tool (Home/Session/Settings/Admin) is `white/10`/`white/5`
— the "warmth, community, human side of MUN" half of the brand identity only shows up on the pitch
page. Not flagged as a bug — a deliberate minimal-accent choice is defensible — but worth an
explicit product decision either way rather than being incidental.

**Also checked, no issues:** corner-radius consistency (sharp corners on cards/buttons/inputs,
`rounded-full` reserved for pills/knobs/seat-dots throughout), reduced-motion exemptions (only
`SettingsPage`'s toggle knob, matching `CLAUDE.md`'s documented single carve-out), `--danger`
usage (correctly routed through the CSS var everywhere checked), Logo rendering (unstretched,
uncolored, consistent on every page/theme checked).

## Accessibility

Found by running an automated `axe-core` scan (WCAG 2.0/2.1 A + AA + best practices) against the
local dev server, one page per route, using `puppeteer-core` against system Chrome. Not sourced
from Vercel's own toolbar/dashboard (that panel runs client-side in-browser and isn't retrievable
via the CLI/API) — this is a local stand-in covering the same kind of findings. Unlike the other
sections here, this wasn't run by one of the four review subagents — a manual/scripted sweep,
merged in from a standalone scan.

Last full sweep: 2026-09-04. Routes scanned: `/`, `/home`, `/session`, `/rollcall`, `/motion`,
`/vote`, `/timer`, `/settings`, `/cloud`, `/stats`. No conference `.xlsx` was loaded during the
scan, so `/session`, `/rollcall`, `/motion`, `/vote`, `/timer`, and `/stats` all rendered
`NoCommitteeModal` rather than their real content — see ACC-005. A follow-up scan with a loaded
conference would be needed to check those pages' actual UI.

| ID | Severity | Status | Location |
|---|---|---|---|
| ACC-001 | Critical | Open | `src/components/Queue.jsx:276` |
| ACC-002 | Critical | Open | `src/pages/SettingsPage.jsx:227` |
| ACC-003 | Serious | Open | `src/components/Logo.jsx:5` |
| ACC-004 | Serious | Open | `/`, `/home`, `/settings` (color contrast) |
| ACC-005 | Moderate | Open | Nearly every route (missing document structure) |

**ACC-001 — Unlabeled remove button in the speaker queue (`button-name`).** The remove/trash
button in `Queue.jsx` has no `aria-label` — a screen reader announces just "button". Its four
sibling buttons (move to top/up/down/to bottom, lines 245-269) all have one; this is the one that
was missed. Found on `/` (landing hero demo) and would affect `/session` too.

**ACC-002 — Unlabeled reduced-motion toggle (`button-name`).** The "Reduced motion" toggle
(`role="switch"`) has no `aria-label` and no text content, only a decorative knob `<span>`. A
screen reader announces "switch, not checked" with no indication of what it does.

**ACC-003 — Prohibited ARIA attribute on Logo (`aria-prohibited-attr`).** `aria-label="Motion"` on
a plain `<div>`. A `<div>` has no implicit ARIA role that supports a computed name, so the label is
dropped by assistive tech; per the ARIA spec this needs an explicit role that supports naming (e.g.
`role="img"` if it should read as one unit) or should just be removed in favor of the visible
"Motion" text already inside it. `Logo` is used in every page's top bar, so this likely affects
most routes, not just `/` where the scan happened to flag it.

**ACC-004 — Insufficient color contrast (`color-contrast`).** Flagged on `/` (19 nodes), `/home`
(2 nodes — the footer text), and `/settings` (22 nodes, mostly muted/faint text classes like
`text-[var(--app-text-faint)]` and the `[9px]`/`[10px]` uppercase labels). The scan reports *which*
elements fail, not the exact ratio — these need a manual contrast check (e.g. against
`--app-text-muted`/`--app-text-faint` on `--app-panel`/`--app-chip` backgrounds in both themes) to
confirm and fix. Given the volume and that it's mostly the same muted-text pattern repeated, this
is likely a small number of root CSS custom properties in `themes.css` rather than dozens of
individual fixes.

**ACC-005 — Missing document structure on nearly every route.** Three related rules:
`landmark-one-main` (no `<main>` landmark — `/home`, `/settings`, `/cloud`, and likely the rest),
`page-has-heading-one` (no level-one heading — `/home`, `/settings`, `/cloud`), and `region` (page
content isn't contained in a landmark region at all — flagged on every route scanned). Matches what
`CLAUDE.md` already says about the routing setup: "Pages are flat, not nested — there's no shared
layout wrapper; each page composes its own header." None of the per-page headers currently emit a
`<main>` or use heading levels consistently, so this shows up everywhere rather than being a
one-off. On `/session`, `/rollcall`, `/motion`, `/vote`, `/timer`, and `/stats` specifically, the
flagged element is `NoCommitteeModal`
([NoCommitteeModal.jsx:13-14](src/components/NoCommitteeModal.jsx#L13-L14)) since that's what
rendered without a loaded conference — the same `region` issue would very likely also apply to
those pages' real content once a conference is loaded, given the same flat-page pattern.

## Docs

Findings from `docs-sync-reviewer` sweeps — drift between actual functionality and
`.claude/motion.md` / `.claude/roadmap.md` (and factually-false claims in `README.md`).

Last full sweep: 2026-08-16. All 7 findings trace to one cause: the SEC-008 permissions-system
change (see `## Security` above) landed without updating either doc, as `CLAUDE.md` requires.

| ID | Doc | Type | Status | Location |
|---|---|---|---|---|
| DOC-001 | motion.md | Missing | **Fixed** (2026-08-16) | Admin Panel section (~line 214-229) |
| DOC-002 | motion.md | Stale | **Fixed** (2026-08-16) | Multi-domain architecture table (~line 45) |
| DOC-003 | motion.md | Stale | **Fixed** (2026-08-16) | Multi-domain architecture table (~line 43) |
| DOC-004 | motion.md | Stale | **Fixed** (2026-08-16) | Dev tooling section (~line 259-264) |
| DOC-005 | motion.md | Stale | **Fixed** (2026-08-16) | Explicit non-features (~line 276-279) |
| DOC-006 | roadmap.md | Missing | **Fixed** (2026-08-16) | Built but not on README's public roadmap (~line 48-50) |
| DOC-007 | roadmap.md | Stale | **Fixed** (2026-08-16) | Known gaps (~line 60-63) |

**DOC-001 — Admin Panel section missing the Permissions tab.** motion.md only describes Firebase
Auth account CRUD; doesn't mention the new Permissions tab or `api/admin/permissions/*`.

**DOC-002 — `debug.motionmun.com` host table says "owner-gated."** `DebugPage`/`ReferPage` now
check `usePagePermission("debug"/"refer")`, not a hardcoded owner allowlist.

**DOC-003 — `app.motionmun.com` host table says `OwnerGate` requires an allowlisted email.**
`OwnerGate` now checks the `"app"` permission via `src/services/permissions.js`.

**DOC-004 — Dev tooling section still calls `DebugPage`/`ReferPage` "owner-gated."** Same fix as
DOC-002, applied to the dev-tooling writeup instead of the host table.

**DOC-005 — "Explicit non-features" mischaracterizes the gates as pure client-side allowlists.**
`DebugPage`/`ReferPage` are now partially server-backed (read `contributorPermissions` from
Firestore); only `AdminPanelPage` remains a pure client-side allowlist check.

**DOC-006 — roadmap.md's Admin Panel line omits the Permissions tab** entirely.

**DOC-007 — roadmap.md's Known gaps entry says `AdminPanelPage` "shares that same page-level
gate"** as `DebugPage`/`ReferPage` — no longer true, they're on separate systems now (permissions
vs. hardcoded owner list).

Docs-sync-reviewer provided ready-to-paste replacement text for all 7 — see the agent's full
report for exact wording, not reproduced here to keep this file scannable.

## Verification

Findings from `verifier` sweeps — general code-quality critique (unnecessary complexity, missed
reuse, robustness gaps, misleading naming, inconsistency with this codebase's own established
patterns). Deliberately restrained: only genuinely actionable findings, not a style nitpick log.
Not security (`security-reviewer`), not visual (`design-reviewer`), not doc drift
(`docs-sync-reviewer`).

No sweeps run yet.
