# Roadmap status

Tracks what's actually implemented vs. planned. Update this as features land - don't let it
drift out of sync with reality the way `README.md`'s roadmap did.

## Phase 1 - done

- Delegate import (`src/services/AllocationParser.js`, `src/services/ConferenceService.js`)
- Attendance tracking (`src/pages/RollCallPage.jsx`)
- General Speakers List (`src/components/Queue.jsx`, `src/components/SessionBoard.jsx`)
  - One-click move-to-top/move-to-bottom per speaker, alongside the existing single-step up/down.
- Voting tools (`src/pages/MotionPage.jsx`, `src/components/SeatChart.jsx`, `src/components/VotingPanel.jsx`)
  - Absent delegates auto-abstain (`src/utils/voteGroups.js`), and a standalone `/vote` page
    (`src/pages/GeneralVotingPage.jsx`) runs the same voting module without a logged motion.
- Standalone timer page (`src/pages/TimerPage.jsx`, `/timer` route) - a bare clock with no
  committee bookkeeping, double-click-to-retype MM:SS entry built into `Timer.jsx`'s `editable` prop.
- Resolution tools (quick-launch buttons on `/motion`) and the resolution-debate speaker rotation
  widget (`src/utils/rotation.js`, `ConferenceService.js`, `src/components/SessionBoard.jsx`) -
  removed from scope (see `.claude/motion.md`'s "Explicit non-features").

## Phase 2

- Custom motion presets - done (`src/motionPresets.js`, `src/components/MotionPresetManager.jsx`)
  - Full CRUD (add/edit/delete) over the motion vocabulary `MotionInput.jsx` matches against,
    including the built-in motions from `constants.js`'s `MOTIONS`, persisted to `localStorage`
    (same pattern as `src/shortcutPrefs.js`). Managed from a new "Motion presets" section on
    `/settings`.
  - Account-synced (`src/services/prefsSync.js`) - signing in makes a `userPrefs/{uid}` Firestore
    doc the source of truth for both this and keyboard shortcut remapping, fixing the
    shared-device leak that pure `localStorage` had (see `.claude/motion.md`).
- Resolution display / draft-resolution management - removed from scope, not planned

## Phase 3 - partially started

- Multi-chair synchronization - done (`src/services/CloudSessionService.js`, `firestore.rules`,
  `src/pages/CloudSessionsPage.jsx`)
- Analytics and reporting - basic version done (`src/pages/StatsPage.jsx`); no export/PDF
  reporting yet
- Conference-wide integrations - not started
- Delegate View (`delegate.motionmun.com`) - done (`src/services/LiveSessionService.js`,
  `src/pages/DelegateSessionPage.jsx`, `src/hooks/useAnchoredCountdown.js`, QR/link panel on
  `CloudSessionsPage.jsx`) - public read-only mirror of speaker queue/timer/active motion, joined
  by QR code, requires a cloud session. See `.claude/motion.md` for the full writeup. DNS for the
  `delegate.motionmun.com` subdomain itself still needs to be provisioned on Vercel (manual step,
  same as the other subdomains - not automated in this repo).

## Built but not on README's public roadmap

- Dev tooling: `src/pages/DebugPage.jsx` (side-by-side raw-parser vs. processed-service output,
  fuzzy-match tuning for `MotionInput`)
- Admin panel (`src/pages/AdminPanelPage.jsx`, `debug.motionmun.com/adminPanel`) - owner-only
  Firebase Auth account CRUD (list/create/disable/delete via `api/admin/users.js`), a Permissions
  tab for managing contributor-level access to `/debug`, `/refer`, and `app.motionmun.com`
  (`api/admin/permissions.js`), and an Announcements tab for emailing the waitlist
  (`api/admin/announcements.js`) - see `.claude/motion.md` for the full writeup. All three endpoints
  are single files dispatching on method/`action` rather than one file per operation, to stay well
  under Vercel Hobby's 12 serverless-function-per-deployment cap. All endpoints backed by real
  server-side ID-token verification (`api/admin/_lib/requireOwner.js`), not just a client-side gate.
- Announcements audience is waitlist-only for now (`waitlistSubscribers` Firestore collection,
  populated by `api/waitlist/welcome.js` on signup). Sending to "everyone who's signed up" more
  broadly (e.g. every Firebase Auth account) is a marked but unbuilt spot in `AdminPanelPage.jsx`.

## Low-priority ideas

- Wiki / getting-started guide - a lightweight page or doc walking a new chair through loading a
  conference and running a session. Not planned as a real effort; low expected usage doesn't
  justify more than a simple static page if it ever gets built.

## Known gaps

- `DebugPage`/`ReferPage`'s access gate reads a per-contributor permission
  (`src/services/permissions.js`, backed by Firestore) checked client-side only - fine for a dev
  tool, not a real security boundary. `AdminPanelPage` is on a separate, owner-only gate (not part
  of the delegable permission system), and unlike its siblings its actual data access is
  independently backend-checked (`api/admin/_lib/requireOwner.js` verifies a Firebase ID token
  server-side).
