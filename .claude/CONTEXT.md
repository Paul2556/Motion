# Motion

A committee management platform for Model UN conferences: delegate import, attendance, speaker
queue/timer, and voting. Client-side only — a Conference is loaded from an uploaded `.xlsx` and
lives in memory for that browser tab.

## Language

**Conference**:
The top-level entity loaded from one uploaded `.xlsx` workbook. Contains one or more Committees,
one per sheet. Lives in memory only, for that browser tab.

**Committee**:
One sheet within a Conference's workbook (`{ id, title, topic, chairs, delegates }`), reshaped by
`ConferenceService.buildCommittee`. The unit a Chair actively runs — roll call, speaker queue,
voting — at any given time.

**Delegate**:
A person represented within a Committee, tracked with session-only state: `present`, `voting`,
`hasSpoken`, `speakingTime`, `notes`.

**Chair**:
The person running a Committee. Motion's primary user — "Built by delegates. Designed for chairs."

**Roll call state**:
The three-state presence model per Delegate: `absent` / `present` / `voting` (voting implies
present). Collapsed onto the `present`/`voting` booleans rather than a separate field.

**Motion** (procedural):
A formal action a Delegate can raise during debate (e.g. "Open a Moderated Caucus," "Motion to
Divide the House"). Canonical vocabulary lives in `MOTIONS` (`src/constants.js`), user-extensible
via Motion presets (`src/motionPresets.js`).
_Avoid_: unqualified "Motion" when the platform itself is meant — the app name and the procedural
term collide in almost every sentence about this codebase; qualify explicitly ("a motion," "the
Motion presets," "the Motion platform") when ambiguous.

**Simple Majority / Super Majority**:
Vote-threshold labels computed in `getVoteStatusLabel` (`src/utils/voteStatus.js`). Simple Majority
is reached at `floor(totalSeats / 2) + 1` "for" votes; Super Majority at
`floor(totalSeats * 2 / 3) + 1`.

**In-memory session** (the tab-scoped default, not a Cloud Session):
The implicit lifetime of a loaded Conference: exists only for that browser tab. Roster data
survives a reload via `sessionStorage` (a deliberate feature, not a persistence bug — see
`docs/agents` ADR-0001) but never leaves that tab or device.

**Cloud Session**:
The opt-in multi-chair sync feature (`CloudSessionService`, `firestore.rules`,
`CloudSessionsPage.jsx`) that persists a Conference to Firestore under a `memberIds` list so
multiple Chairs can share one live Committee state.
_Avoid_: bare "session" when either meaning is ambiguous — say "Cloud Session" explicitly, or
"in-memory session" if the tab-scoped default needs distinguishing from it.
