# Repo Map

Structural snapshot of the repo for fast orientation — generated 2026-09-04 by reading every
file under `src/`, `api/`, and root config. **This is a snapshot, not a live view**: paths, line
counts, and "wired up" claims below can go stale as the code changes. Treat it as a starting
point and verify anything load-bearing (grep for the symbol/path) before acting on it, especially
if it's been a while since the "Generated" date. Not auto-loaded — read this file on demand when
you need whole-repo orientation; for narrative architecture (data flow, theming, why things are
built the way they are) see `CLAUDE.md`, `motion.md`, `roadmap.md`.

## Directory tree

```
Motion/
├── .claude/                  Agent memory: CLAUDE.md, motion.md, roadmap.md, issues.md,
│                              brandIdentity.md, repoMap.md (this file), agents/ (4 subagent defs)
├── .github/                  workflows/ci.yml (build+lint, Node 22), CODEOWNERS, PR template
├── .vercel/                  Local Vercel CLI project link — machine-specific, not repo structure
├── api/                      Vercel serverless functions (Node runtime, not bundled by Vite)
│   ├── admin/                 Owner-only endpoints (users, permissions, announcements) + _lib
│   ├── discord/                EMPTY — vestigial
│   ├── feedback/               submit.js + Discord notify helper
│   ├── source/                 Shared server _lib (email, rate limit, Discord, unsubscribe tokens)
│   │   └── _archive/            EMPTY — vestigial
│   └── waitlist/                welcome.js (signup+email), unsubscribe.js
├── public/                   favicons, apple-touch-icon, license.txt (static copy of LICENSE)
├── scripts/                  EMPTY — tracked but unused
├── src/                      App source — see file tables below
├── firebase.json / firestore.rules   Firestore rules (client SDK access control)
├── vercel.json                SPA rewrite + security headers
├── eslint.config.js / postcss.config.js / tailwind.config.js / vite.config.js
├── .nvmrc (24) / .npmrc / .editorconfig / .env.example
└── index.html / LICENSE / README.md / package.json
```

## `src/` root files

| File | Purpose |
|---|---|
| `App.jsx` | 5 route tables selected at runtime by `window.location.hostname` vs `hosts.js`; wraps app/debug hosts in `OwnerGate` |
| `main.jsx` | Mounts `<App>` in `BrowserRouter`, calls `initAppTheme()` + `initPrefsSync()` |
| `appTheme.js` | localStorage dark/light/brown theme + reduced-motion for `.app-shell` pages (separate from landing page's own system) |
| `constants.js` | `MOTIONS` list, ISO-3166 `countries`/`historicalCountries` + aliases, header-classification word sets for `AllocationParser`, committee icon-alias table |
| `firebase.js` | Lazy-init Firebase client SDK; `isFirebaseConfigured()` guards missing env vars |
| `hosts.js` | Per-subdomain host arrays (`APP_HOSTS`, `DEMO_HOSTS`, …) + `isLocalDevHost()` |
| `motionPresets.js` | localStorage CRUD for editable motions list, seeded from `constants.js`; pub/sub for `prefsSync.js` |
| `motionInputMode.js` | *(new, uncommitted)* localStorage get/set for "natural" vs "dropdown" motion-entry mode — see Flags below |
| `shortcuts.js` | `SHORTCUT_SCOPES` default keybindings per view |
| `shortcutPrefs.js` | localStorage keybinding remap overrides + display formatting; pub/sub for `prefsSync.js` |
| `index.css` / `themes.css` | Tailwind entry + global styles / CSS custom properties for `.app-shell` theme system |

## `src/pages/` (19 files, ~5.1k lines)

| File | Purpose |
|---|---|
| `LandingPage.jsx` | Public marketing site — own light/dark "theme-shell" system, live product demos, waitlist form |
| `PreviewLandingPage.jsx` | Alt landing design concept; only reachable at `/previewlanding`, never in `MarketingRoutes` — inert in production |
| `AdminPanelPage.jsx` | Owner-only: Firebase Auth user mgmt, contributor permissions, waitlist announcement composer |
| `DebugPage.jsx` | Dev tooling: raw `AllocationParser` vs `ConferenceService` output, live `MotionInput` tester |
| `HomePage.jsx` | Post-login dashboard: resume/load/cloud sessions, demo picker |
| `MotionPage.jsx` | Core motion workflow: natural-language or dropdown entry (mode from `motionInputMode.js`), motion log, voting, speaking-time launcher |
| `SettingsPage.jsx` | Theme, reduced-motion, account, shortcut remapper, motion input mode toggle, `MotionPresetManager` |
| `CloudSessionsPage.jsx` | Firebase multi-day session sync: collaborators, cross-day attendance, QR "Go Live" broadcast/login |
| `RollCallPage.jsx` | 3-state attendance roster, bulk toggle w/ confirm modal, single-slot undo |
| `DelegateSessionPage.jsx` | Public read-only delegate view, subscribes to `LiveSessionService` |
| `GeneralVotingPage.jsx` | Standalone ad hoc vote, reuses `VotingPanel`/`voteGroups.js` |
| `SessionPage.jsx` | Wraps `SessionBoard` for `/session`, seeds queue from router state |
| `StatsPage.jsx` | Per-committee present/spoken counts, speaking-time leaderboard |
| `TimerPage.jsx` | Bare standalone countdown, no queue/motion bookkeeping |
| `LicensePage.jsx` | Renders repo-root `LICENSE` via hand-rolled markdown-subset parser |
| `FeedbackPage.jsx` | Demo-host-only form → `/api/feedback/submit` |
| `ReferPage.jsx` | Debug-permission UTM referral-link generator |
| `NotFoundPage.jsx` | Two 404 variants depending on host |

## `src/components/` (19 files, ~3.1k lines)

| File | Purpose |
|---|---|
| `MotionInput.jsx` | Largest component (749L): natural-language motion parser, fuzzy-matches motions/delegations/durations/topics with typo-tolerant edit-distance matching |
| `SeatChart.jsx` | Hemicycle SVG chart, auto row-packing, majority/supermajority dashed threshold lines |
| `Timer.jsx` | Countdown ring, wall-clock RAF anchoring (drift-proof), publishes anchors for live sync |
| `MotionPresetManager.jsx` | Settings sub-panel: add/edit/delete/reorder/reset motion presets |
| `Queue.jsx` | Speaker queue: autocomplete add, reorder, remove — plain controlled `queue`/`setQueue` props |
| `SessionBoard.jsx` | Shared dais layout (Timer+Queue+stats) used by `/session` and landing page's live hero preview |
| `MotionDropdownForm.jsx` | *(new, uncommitted)* Structured form alternative to `MotionInput` — see Flags below |
| `VotingPanel.jsx` | Shared For/Against/Abstain UI, used by `MotionPage` and `GeneralVotingPage` |
| `MotionLog.jsx` | Logged motions list with second/vote/delete controls |
| `AppTopBar.jsx` | Shared nav for Roll Call/Motion/Vote/Timer pages |
| `DebugTopBar.jsx` | Nav for debug-host pages, filtered by permission |
| `ShortcutLegend.jsx` | Modal listing active shortcuts, scoped to global + current view |
| `SpeakingTimeSelector.jsx` | Preset/custom speaking-time picker |
| `OwnerGate.jsx` | Early-access sign-in gate wrapping app/debug routes |
| `DelegateRoster.jsx` | Generic flag+country list with caller-supplied right-side slot |
| `Logo.jsx` | Inline SVG wordmark |
| `NoCommitteeModal.jsx` | Full-screen "load a conference first" blocker |
| `Flag.jsx` | Country flag SVG by ISO code (`import.meta.glob` over `src/assets/flags`) |
| `CommitteeIcon.jsx` | Committee icon SVG matched from freeform title text |

## `src/services/` (8 files, ~1.4k lines)

| File | Purpose |
|---|---|
| `ConferenceService.js` | Singleton in-memory conference/committee/delegate store; attendance, speaking stats, validation |
| `AllocationParser.js` | Parses `.xlsx` allocation sheets (ExcelJS), tolerant of per-conference layout differences |
| `CloudSessionService.js` | Firestore CRUD for multi-day cloud sessions, per-day attendance reset logic |
| `AuthService.js` | Firebase Auth wrapper: Google/email sign-in, QR quick-login (password in URL fragment) |
| `prefsSync.js` | Syncs preset/shortcut localStorage to/from Firestore `userPrefs/{uid}` |
| `permissions.js` | `fetchMyPermissions`/`usePagePermission` — checks `contributorPermissions/{uid}` |
| `LiveSessionService.js` | Publishes/subscribes dais state to Firestore for the public delegate view |
| `ownerAccess.js` | Hardcoded `OWNER_EMAILS` + `isOwner()` — real trust boundary, mirrored by `api/admin/_lib/requireOwner.js` |

## `src/hooks/`, `src/utils/`, `src/data/` (~410 lines total)

| File | Purpose |
|---|---|
| `hooks/useDaisShortcuts.js` | Global keydown listener mapping `event.code` to per-scope handlers |
| `hooks/useAnchoredCountdown.js` | RAF-interpolated countdown from an anchor — same math as `Timer.jsx`, factored for the delegate view |
| `utils/voteGroups.js` | Pure vote-tally helpers, absent delegates auto-abstain |
| `utils/committeeIcon.js` | Matches title text against alias table for `CommitteeIcon.jsx` |
| `utils/formatLicenseText.js` | Markdown-subset splitter, used only by `LicensePage` |
| `utils/voteStatus.js` | Full House / Super Majority / Simple Majority label |
| `utils/formatTime.js` | `mm:ss` formatter (incl. negative overtime) |
| `utils/motionSummary.js` | Builds a human sentence from a logged motion entry |
| `utils/duration.js` | minutes(float) → "N sec"/"N min"/"Nm Ns" |
| `data/demoConferences.js` | Two bundled sample conferences (UNSC, SOCHUM) for `demo.motionmun.com` |
| `data/announcementTemplates.js` | Prefill templates for the admin announcement composer |

`src/assets/`: `committee/*.svg` (12 icons), `flags/*.svg` (~250 Flagpack country flags).

## Root config/tooling

| File | Note |
|---|---|
| `vite.config.js` | Minimal — just `@vitejs/plugin-react` |
| `eslint.config.js` | Flat config; separate ruleset for `api/**` (Node globals) vs `src/**` (browser) |
| `tailwind.config.js` | Content globs `index.html` + `src/**/*.{js,jsx}`; only customizes `fontFamily.sans` |
| `vercel.json` | SPA catch-all rewrite + security headers (Referrer-Policy, X-Content-Type-Options, X-Frame-Options: DENY) |
| `firebase.json` / `firestore.rules` | Rules only, no Firebase Hosting (hosting is Vercel); session membership via unified `memberIds` array; several `if false` admin-SDK-only collections incl. vestigial `sourceRequests`/`sourceTokens` |
| `.env.example` | Firebase client keys, `FIREBASE_SERVICE_ACCOUNT_B64`, Discord bot token/channel, Resend API key, waitlist Sheet webhook, unsubscribe HMAC secret |
| `.github/workflows/ci.yml` | build + lint jobs on push/PR to main/master/deployed, Node 22 |
| `package.json` | Notable deps: `exceljs`, `firebase` + `firebase-admin`, `qrcode.react`, `discord-interactions`; no test runner configured |

## Flags — uncommitted/vestigial as of 2026-09-04

- **`src/components/MotionDropdownForm.jsx` + `src/motionInputMode.js`** — uncommitted but *not*
  WIP: both fully wired (`SettingsPage.jsx` toggles the mode, `MotionPage.jsx` reads it and renders
  `MotionDropdownForm` when mode is `"dropdown"`). Matches uncommitted diffs in `LandingPage.jsx`,
  `MotionPage.jsx`, `SettingsPage.jsx` — reads as one finished feature awaiting commit.
- **`api/discord/`, `api/source/_archive/`, `scripts/`** — empty, tracked, vestigial.
- **`firestore.rules`** — `sourceRequests`/`sourceTokens` collections kept as `if false` per an
  in-file comment noting the source-request flow is gone.

## Size

~336 files under `src/` (mostly SVG assets), 69 JS/JSX/CSS files totaling ~11.6k lines.
`api/`: 17 files, ~1k lines. No test suite, no TypeScript despite it being a listed dependency.
