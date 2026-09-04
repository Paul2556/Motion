# Motion

**This file must be kept current.** Every time a feature is added, removed, or meaningfully
changed, update the relevant section below in the same session/PR that makes the change — see
`CLAUDE.md`'s Agent Memory section. This is a definition of the product as it actually exists in
code today, not a roadmap or a pitch — if something below is aspirational, it belongs in
`README.md` or `roadmap.md` instead.

## What it is

Motion is a committee management platform for Model United Nations (MUN) conferences. It replaces
the spreadsheets, physical timers, and manual vote-counting chairs currently juggle across
multiple disconnected tools with one browser tab: delegate import, attendance, speaker queue and
timer, natural-language motions, and voting.

- **Client-side only, no backend, by default.** A conference is loaded from an uploaded `.xlsx`
  workbook and lives entirely in that browser tab's memory (`sessionStorage`-backed so a refresh
  survives, but closing the tab leaves no trace). The one opt-in exception is **Cloud Sessions**
  (below), which is the only feature that talks to a real backend (Firebase).
- **Stack:** React + Vite + Tailwind, React Router. Deployed to Vercel.
- **Brand:** name/tagline/logo meaning documented in `README.md` ("From motion to resolution" —
  black & white primary palette, brown accent). Don't duplicate that here; this file is about
  functionality.

## Brand identity, at a glance

- **Name:** *Motion* — the fundamental MUN action that starts discussion and moves debate forward.
- **Tagline:** *From motion to resolution.*
- **Lifecycle the product follows:** Motion → Formation → Debate → Resolution.
- **Logo:** a circle (a motion in progress) + four bars (the four lifecycle stages) — `Logo.jsx`.
- **Palette:** black & white (professionalism, structure, contrast) with a brown accent (`#9a5b3a`
  dark-mode-adjusted to `#65a4c5`... see `themes.css` `--accent`) representing the human,
  community side of MUN.

## Multi-domain architecture

One Vercel deployment serves several custom domains; `src/App.jsx` picks the route tree at runtime
from `window.location.hostname` (a plain client-rendered SPA, no per-domain server routing):

| Host | What mounts | Notes |
|---|---|---|
| `motionmun.com` / `www.motionmun.com` | Marketing (`LandingPage`, `/licensing`) | Public. |
| `app.motionmun.com` | The full app | **Gated** — `OwnerGate` requires the `app` permission (owners implicitly have it; contributors get it via the Admin Panel's Permissions tab — see `src/services/permissions.js`), private early access. |
| `demo.motionmun.com` | The full app, ungated | Public preview. Shows a fixed "EARLY ACCESS DEMO" badge (top-right) and a fixed "Intended for computers, laptops, or tablets only" disclaimer bar (bottom) on every page. Adds a "Try a Demo Conference" picker on Home so visitors without a real workbook can load a bundled sample conference (`src/data/demoConferences.js`) instead of uploading one. |
| `debug.motionmun.com` | `DebugPage` + `ReferPage` + `AdminPanelPage` only | `DebugPage`/`ReferPage` gated on the `debug`/`refer` permissions respectively; `AdminPanelPage` remains owner-only (see Admin Panel below). |
| `delegate.motionmun.com` | `DelegateSessionPage` (`/s/:sessionId`) only | Public, ungated, no login — see Delegate View below. |
| Anything else (localhost, Vercel previews, IPs) | The full combined route table, ungated | Local dev / preview convenience. |

## Core features

### Delegate import & conference loading
- Upload an `.xlsx` allocation sheet (Home page) → parsed by `AllocationParser` (ExcelJS-based,
  tolerant of real-world template variation: merged cells, offset columns, French headers,
  fill-down stance columns) → reshaped into session-ready committee records by
  `ConferenceService`.
- Multi-committee workbooks show a "which committee are you chairing?" picker.
- Demo hosts get a bundled-sample-conference picker instead of/alongside file upload.
- The Conference Status card on Home is a **read-only status display** (not a second upload
  dropzone) — "New Conference" is the one button that opens the file picker, intentionally, so
  there's a single obvious way to load a workbook.
- `validateConference()` flags missing committees, missing delegate names/countries, and
  duplicate delegates.

### Committee icons
- `src/assets/committee/*.svg` — original, hand-drawn pictograms (lucide-style: 24×24,
  `currentColor`, 1.5 stroke) for common MUN committees (UNSC, GA1–GA4/GA6, GA plenary, ECOSOC,
  HRC, UNICEF, WHO, UNESCO). Deliberately **not** official UN/agency emblems — those are legally
  protected trademarks, not freely reusable in a commercial product.
- `constants.js`'s `committee` array maps freeform committee titles (whatever text a real
  workbook's sheet name uses) to an icon via alias substring matching (`src/utils/committeeIcon.js`,
  whole-word/case-insensitive, first match wins, most-specific-first ordering).
- `CommitteeIcon.jsx` renders the matched icon (inlined SVG markup, not `<img>`, since
  `currentColor` needs the DOM's inherited text color) or a fallback when nothing matches.
- Currently wired up on Home's Conference Status card, matched against the *active committee's*
  own title (not the overall conference/workbook name).

### Roll call / attendance (`/rollcall`)
- Three-state per delegate: Absent / Present / Present & Voting.
- Keyboard-driven (arrow keys to move selection, dedicated keys to set state — see Keyboard
  shortcuts below) with the selection auto-scrolling into view as it moves.
- "Everyone" bulk-set control, with a confirmation prompt when a bulk change would flip a large
  fraction of a sizeable roster (`shouldConfirmBulkChange`).
- Single-slot undo for both individual and bulk changes.
- "Continue" hands off to `/motion`'s speaking time selector (see Motions below), not straight to
  `/session` — roll call's real next step in a live committee is deciding the next speech length.

### Speaker queue & timer (`/session`)
- `SessionBoard` (shared between the real `/session` route and the landing page's live hero
  preview) — current speaker, a reorderable speaker queue (`Queue.jsx`) with autosuggest scoped to
  the loaded committee's actual delegates, and a countdown `Timer`.
- `Timer.jsx` drives its ring via `requestAnimationFrame` + a wall-clock anchor, not `setInterval`,
  for a genuinely smooth countdown.
- Speaking time is tracked per delegate as speakers are recognized, feeding Stats.
- Estimated total remaining time, spoken count, and queued count shown live.
- Single-slot undo for "recognize next" and "remove from queue."
- Shows the `NoCommitteeModal` guard if reached with no conference loaded (same as every other
  committee-scoped page).
- Timer duration comes from the active motion's speaking time, falling back to its **total**
  time when there's no per-speaker rate (e.g. an unmoderated caucus) — `SessionPage.jsx`.
- `Queue.jsx` supports one-click move-to-top/move-to-bottom per speaker, alongside the existing
  single-step up/down (e.g. a moderated caucus's raiser asking to speak first or last).

### Timer (`/timer`)
- A bare standalone clock — no motion log, queue, or committee-state wiring beyond the AppTopBar
  label. For a chair who just wants a timer running (a caucus, an informal, anything that isn't a
  logged speaker list) without any of that other bookkeeping.
- Starts at 3 minutes. Double-clicking the ring (`Timer.jsx`'s `editable` prop) swaps the display
  for two inline fields (minutes capped at 999, seconds capped at 59, colon fixed in place) so a
  chair can type a new time directly rather than picking from a separate screen.
- 4th tab in `AppTopBar.jsx` alongside Roll Call / Motion / Vote.

### Motions (`/motion`)
- **Natural-language motion input** (`MotionInput.jsx`) — type a motion the way a chair would say
  it ("open a mod caucus for 10 minutes on the topic of nuclear disarmament") and it parses motion
  type, duration, and topic. Fuzzy-matches phrasing and words (edit-distance based, typo-tolerant,
  tunable via a `fuzzyLevel` — see Dev tooling) against the motion vocabulary in `constants.js`
  (`MOTIONS`).
- The motion vocabulary is user-customizable from Settings — full CRUD (add/edit/delete, including
  the built-ins) via `src/motionPresets.js`, which persists the effective list to `localStorage`
  and falls back to `constants.js`'s `MOTIONS` as the seed/default set.
- Durations parse in **minutes or seconds** ("12 min" or "12 seconds" both work, mixed within the
  same motion — e.g. total time in minutes, speaking time in seconds). Stored internally as
  minutes (a float) throughout the app; `src/utils/duration.js`'s `formatDuration` renders that
  back as whichever unit reads naturally (`"12 sec"`, `"12 min"`, `"1m 30s"`) everywhere a
  duration is shown (`MotionInput`'s summary row, `MotionLog`, `formatMotionSummary`).
- Motion log with second/unsecond (a numeric stepper capped at committee size, shown as a
  split ± button once seconded at least once), delete (with undo), and per-entry "open vote."
- Opening a vote sets that motion as the committee's active motion, which the `/session` timer
  badge reflects.
- **Precedence ordering** — the motion log always shows the most procedurally "disruptive" motion
  on top (e.g. a Point of Order above a pending Moderated Caucus), not just newest-first. Rank is
  the motion's position in `constants.js`'s `MOTIONS` array (index 0 = most disruptive), which a
  chair can re-tune per conference from Settings' motion preset editor (up/down reorder).
- Motion vocabulary includes the full THAIMUN Rules of Procedure motion/point set (points of order,
  personal privilege, information, parliamentary inquiry, clarification; appeals; post-vote
  motions; etc.) alongside the original generic set — see the footnote at the bottom of the page.
- **Speaking time selector** (`SpeakingTimeSelector.jsx`) — 60/75/90 second presets plus a "More"
  custom-seconds input. Picking one sets a synthetic "Speakers' List"
  active motion (same `activeMotion.speakingTime` field the timer already reads) and navigates to
  `/session` with a one-time router-state flag telling it to seed the speaker queue with the full
  roster in alphabetical order — a fresh manual reload of `/session` afterwards does *not*
  re-seed, so it never clobbers a queue the chair has since edited.

### Voting
- `SeatChart.jsx` — a semicircular parliamentary hemicycle visualization, seat count per row
  proportional to radius, with a dashed majority-threshold line positioned so the deciding seat is
  the first one past it.
- `VotingPanel.jsx` — the shared voting module (abstain toggle, majority-status label, seat chart)
  used by both `/motion`'s vote-on-a-logged-motion flow and the standalone `/vote` page.
- For / Against / optional Abstain tallying, keyboard-drivable (select a bloc, +/− to move votes).
- **Absent delegates auto-abstain** (`src/utils/voteGroups.js`) — always forced on regardless of
  the manual "Allow abstentions" toggle, since an absent delegate can't cast a For/Against vote.
- Automatic status label: Simple Majority / Super Majority / Full House
  (`src/utils/voteStatus.js`).
- "Continue to session" carries the passed motion back to the speaker queue as the active motion.

### General Voting (`/vote`)
- A standalone vote tool for chairs who want to run a vote without writing it up as a motion first
  — same `VotingPanel`/`voteGroups.js` tallying and absent-auto-abstain behavior as `/motion`, plus
  an optional freeform label for the chair's own reference. No motion log, no active-motion wiring.

### Stats (`/stats`)
- Present/absent/spoken/remaining counts, total and average speaking time, and a per-delegate
  speaking-time bar chart ranked descending.

### Settings (`/settings`)
- Theme: Black / White / Brown choice (`appTheme.js`, see Theming below) — Black is the native
  dark palette, White flips it via `invert(1)`, and Brown is a real re-theme with its own
  hand-picked CSS custom property values rather than an inverted derivative of Black.
- Reduced motion toggle (disables transitions/animations app-wide, with one carve-out for the
  toggle's own click feedback).
- **Keyboard shortcut remapping** — click-to-rebind per action, scoped by view, with collision
  detection within a scope and one-click reset to default.
- **Motion preset editor** (`MotionPresetManager.jsx`) — full CRUD over the motion vocabulary
  `MotionInput` matches against, including renaming/deleting built-ins, with a "reset to defaults"
  action.
- Account panel: sign-in status, link to Cloud Sessions, sign out.

### Keyboard shortcuts ("DAIS controls")
- `src/shortcuts.js` defines the full default keymap, scoped per view (`global`, `speakerList`,
  `motions`, `rollCall`, plus a `voting` scope that's a **fixed override** while a vote is open —
  spec requirement, not remappable away).
- Matched on `event.code` (physical key position), not `event.key`, so it's layout-independent and
  can distinguish `P` from `Shift+P` unambiguously.
- User overrides persist via `shortcutPrefs.js`; `ShortcutLegend.jsx` shows the current bindings
  per view (toggled with `?`).

### Cloud Sessions (`/cloud`) — the original Firebase-backed feature
- Firebase Auth (Google, email/password, or a QR-code "quick login" that hands a throwaway account
  to a second device) + Firestore.
- Multi-day attendance sync across chairs: create a session, add collaborators by Firebase UID
  (co-chairs get full attendance read/write, only the owner can rename/delete), cycle each
  delegate's attendance per session.
- Entirely opt-in — signing in is never required to use the app; the account-synced preferences
  below are the only other feature that touches Firebase, and only for whoever chooses to sign in.
- Gracefully degrades to "Cloud sessions unavailable" if `VITE_FIREBASE_*` env vars aren't
  configured for a given deployment.

### Delegate View (`delegate.motionmun.com`) — public, unauthenticated
- Chairs generate this from a "Go Live" toggle on `/cloud` (Cloud Sessions must already be set up —
  see below), which shows a plain link and a QR code (`QRCodeSVG`, same component Cloud Sessions'
  quick-login QR already uses) to `https://delegate.motionmun.com/s/{sessionId}`.
- Delegates scan it on their own phone and see, live, with no login: the current speaker, the
  up-next queue (read-only — `Queue.jsx`'s `readOnly` prop hides the add box and per-row controls),
  a countdown timer, and the current motion's label.
- Synced over the same Firestore backend Cloud Sessions already uses, via a new
  `src/services/LiveSessionService.js` — a narrow `sessions/{id}/live/state` doc (never the full
  session doc or attendance), publicly readable, chair-write-only (`firestore.rules`). The app's
  first real-time `onSnapshot` listener.
- The timer syncs cheaply: `Timer.jsx`'s existing wall-clock anchor (re-anchored only on
  start/pause/reset/adjust, not per-frame — see Speaker queue & timer above) is surfaced via a new
  `onAnchorChange` prop and republished with a Firestore `serverTimestamp()` in place of the
  chair's own clock, so a wrong laptop clock can't skew delegates' countdowns. Both `Timer.jsx` and
  the delegate view's read-only display interpolate the live value the same way, via the shared
  `src/hooks/useAnchoredCountdown.js`.
- "Go Live" is per-tab (`sessionStorage`, mirrors `ConferenceService`'s own persistence) — a
  purely local (non-cloud) session never publishes anything.
- Deliberately excludes live vote tallies — broadcasting a running vote count to delegates while
  voting is open could bias the vote; only "a motion is on the floor" (its label) is shown.

### Account-synced preferences (motion presets & keyboard shortcuts)
- `src/services/prefsSync.js`, initialized once from `main.jsx` — guests keep the plain
  `localStorage` behavior `motionPresets.js`/`shortcutPrefs.js` always had; signing in (the same
  Firebase accounts Cloud Sessions uses) makes a new `userPrefs/{uid}` Firestore doc the source of
  truth instead. Exists specifically to fix a shared-device problem: without this, one chair's
  customizations on a shared committee-room computer would leak into the next chair's session.
- **Sign-in**: the account's server data (if any) overwrites local storage unconditionally
  ("server wins," not a merge) and the page reloads. A brand-new account with no server data yet
  gets the current local state pushed up as its starting point instead.
- **Sign-out**: both reset to defaults, so the next person at that device — signed in or not —
  starts clean rather than inheriting whoever was last signed in.
- Every local edit (motions or shortcuts) is pushed to Firestore in the background
  (debounced, best-effort) via a plain pub/sub each module exposes
  (`onMotionsChange`/`onShortcutsChange`) — `prefsSync.js` is the only subscriber, avoiding a
  circular import between it and the two preference modules.
- No changes to any consumer (`MotionInput.jsx`, `MotionPresetManager.jsx`, `SettingsPage.jsx`,
  etc.) — `getMotions()`/`resolveKey()` stay fully synchronous; the sync layer only ever swaps
  what's *in* local storage, then reloads.

### Admin Panel (`debug.motionmun.com/adminPanel`) — dev tooling
- Full CRUD over Firebase Auth accounts (list, disable/enable, delete, create) for the sole
  project owner — `src/pages/AdminPanelPage.jsx`, gated on `isOwner()` (`src/services/ownerAccess.js`)
  directly, unlike `DebugPage.jsx`/`ReferPage.jsx`'s per-permission gate below — real admin access
  is intentionally non-delegable.
- Backed by real server-side endpoints (`api/admin/users/*.js`) using the Firebase **Admin** SDK
  (`api/admin/_lib/firebaseAdmin.js`, same singleton pattern as `api/source/_lib/firebaseAdmin.js`)
  — listing/creating/deleting *other* users' accounts is impossible with the client SDK Cloud
  Sessions/prefsSync use, since a client can only manage the account it's signed into.
- Each endpoint verifies the caller's Firebase ID token server-side
  (`api/admin/_lib/requireOwner.js`) against the hardcoded `OWNER_EMAILS` list
  (`ownerAccess.js`), a cryptographic identity check, since this caller is always a real
  signed-in user.
- Flags (not filters out) the throwaway `quick-*@motion-quicklogin.local` accounts Cloud Sessions'
  QR login creates, since they're real Firebase Auth users and will otherwise be indistinguishable
  from real chair accounts in the list.
- **Permissions tab** — manages contributor-level access to `/debug`, `/refer`, and
  `app.motionmun.com` (`api/admin/permissions/{list,set,remove}.js`, backed by a
  `contributorPermissions/{uid}` Firestore collection, self-read/Admin-SDK-write-only). New
  contributors default to `{ debug: true, refer: false, app: false }`. Deliberately has no "admin"
  toggle — real admin access always stays owner-only, never delegable through this system (see
  `.claude/issues.md`'s SEC-008 for the incident that shaped this).
- **Announcements tab** — composes and sends a one-off email (from `hello@motionmun.com`) to the
  waitlist, `api/admin/announcements.js` (same owner-gated/merged-dispatch pattern as `users.js`/
  `permissions.js`). Reads/writes a `waitlistSubscribers/{emailHash}` Firestore collection (plaintext
  emails, Admin-SDK-only) that `api/waitlist/welcome.js` populates on every signup — see Marketing
  site & waitlist below for why that collection had to be added. Supports a one-time paste-in
  import (comma/newline-separated emails, for backfilling signups that predate this collection) and
  4 starter templates (`src/data/announcementTemplates.js`, UI-only prefill). Sends go through
  Resend's batch endpoint (`sendEmailBatch` in `api/source/_lib/sendEmail.js`, chunked 100 at a
  time) and every email gets a per-recipient unsubscribe link (HMAC-signed,
  `api/source/_lib/unsubscribeToken.js`, verified by the public `api/waitlist/unsubscribe.js`).
  Audience is waitlist-only today; a future audience selector (e.g. all signed-up Firebase users)
  is left as a marked spot in the JSX, not built yet.

### Feedback (`/feedback`)
- Simple form (message + optional email) → `api/feedback/submit.js` → posts to a Discord
  bot/channel via `postFeedbackNotification.js`. No admin workflow, no persistence, just a
  one-way note.
- **Demo-only** — the route only exists on `demo.motionmun.com`'s tree and the local/preview
  catch-all (`AppRoutes`'s `includeFeedback` flag in `App.jsx`), not on the real production
  `app.motionmun.com` host, so it never 404s there. `HomePage.jsx`'s footer link is stricter -
  gated on `isDemoHost` (exact `demo.motionmun.com` match), so it's reachable by direct URL on
  localhost/preview for testing but the link itself only ever shows on the real demo host.

### Marketing site & waitlist (`motionmun.com`)
- `LandingPage.jsx` — public marketing page with a live hero preview of the actual `SessionBoard`
  (unlinked, so it doesn't navigate a visitor away).
- Waitlist signup posts to a Google Apps Script webhook (writes to a Sheet, with UTM/referrer
  attribution) and, best-effort, triggers a welcome email via `api/waitlist/welcome.js` (Resend,
  sender `hello@motionmun.com`) containing a link to try the live demo.
- The Sheet write is the source of truth but is write-only (no read-back), and Firestore's
  `waitlistSends` doc only ever stored a SHA-256 hash of the email (a resend-cooldown key, not a
  readable list) — so `welcome.js` also upserts a plaintext `waitlistSubscribers/{emailHash}` doc
  per signup, which is what the Admin Panel's Announcements tab (above) actually sends to.



### Design preview (`/previewlanding`)
- `PreviewLandingPage.jsx` — a more scroll-driven, alternating-section take on the landing page
  (fanned live-component hero, scroll-linked word reveal, sticky panel that swaps between real
  `DelegateRoster`/`Timer`+`Queue`/`SeatChart`), built to compare against `LandingPage.jsx` without
  touching it. Only registered in `App.jsx`'s `AllRoutes` (local dev + unrecognized-host fallback),
  never `MarketingRoutes` — inert on the real `motionmun.com` domain.

### Licensing (`/licensing`)
- `LicensePage.jsx` renders the repo-root `LICENSE` file's raw text (the Motion Attribution
  License) plus a non-binding plain-language summary, and links out to the public GitHub repo.
  The repo itself is public on GitHub now, so there's no request/approval gate in front of the
  source anymore, the removed `/source` flow's Firestore/Discord/watermarked-zip machinery is
  gone (`api/source/{request,approve,deny,revoke,download}.js`,
  `api/discord/interactions.js`). Note: the LICENSE text's Section 3 still restricts
  redistributing Source Code; reconciling that with the repo now being public is a separate,
  not-yet-done license rewrite - the plain-language summary was updated to point at GitHub, but
  the legal text underneath it wasn't.

### Dev tooling
- `DebugPage.jsx` (`debug.motionmun.com`, gated on the `debug` permission — see Permissions tab
  above) — loads a workbook through both `AllocationParser` (raw) and `ConferenceService`
  (processed) side by side, plus a `fuzzyLevel` slider for tuning `MotionInput`'s typo-tolerance
  live.
- `ReferPage.jsx` (gated on the `refer` permission) — generates UTM-tagged waitlist links for
  attribution tracking.
- `AdminPanelPage.jsx` (owner-only, at `/adminPanel` — not part of the delegable permission
  system) — Firebase Auth account CRUD, backed by real server-side owner verification (see Admin
  Panel above).
- `DebugTopBar.jsx` — shared nav bar across `DebugPage`/`ReferPage`/`AdminPanelPage` for moving
  between those three. Only shows links the signed-in user can actually reach, since access is
  split across two separate systems (delegable `debug`/`refer` permissions vs. `AdminPanelPage`'s
  owner-only gate) and a contributor with only one permission shouldn't see a link that would just
  bounce them back out.

## Theming (two independent systems — see `CLAUDE.md` for the full mechanics)
- `LandingPage` (natively light) manages its own light/dark state independently of the app.
- Every other page (natively dark) uses `src/appTheme.js`. Both flip via `filter: invert(1)`, which
  is why hand-picked hues need a pre-inverted CSS var pair rather than a JS conditional.

## Explicit non-features
- No resolution/draft-resolution management — removed from scope (see `roadmap.md`). This also
  covers two features that briefly existed and were later removed: `/motion`'s "Resolution Reading
  Time"/"Main Submitter Speech" quick-launch buttons, and `/session`'s Against/For(/To) speaker
  rotation widget (`src/utils/rotation.js`, since deleted).
- No committee presets yet.
- No PDF/export reporting yet (Stats is on-screen only).
- No conference-wide integrations yet.
- `OwnerGate`/`DebugPage`/`ReferPage` gate on a permission read from `src/services/permissions.js`
  (self-scoped Firestore read for non-owners, instant for owners) — a real data source, but the
  gate itself is still a client-side redirect, not a server-enforced boundary; nothing sensitive
  lives behind these three on their own. `AdminPanelPage`'s gate is the same convenience-redirect
  shape, but its actual data access is independently backend-checked (`api/admin/*`'s ID-token
  verification, `api/admin/_lib/requireOwner.js`). Cloud Sessions' own data access is enforced by
  Firestore rules, separately from any of this.
