# Client-side only: no server-side persistence of Conference data

Motion loads a Conference from an uploaded `.xlsx` and keeps it in memory for that browser tab
only — no backend stores delegate names, emails, or committee rosters. `sessionStorage` is used so
a reload doesn't lose the loaded roster, but nothing survives closing the tab, and nothing is
shared across devices without opting into a Cloud Session.

**Status:** accepted. Confirmed as a deliberate product decision, not a gap, when SEC-012
(`.claude/issues.md`) flagged that the roster is serialized to `sessionStorage` — resolved
**won't fix**: "surviving a page reload with the roster intact is a deliberate feature," and the
landing page's FAQ already describes the guarantee accurately rather than claiming absolute
zero-persistence.

**Why:** delegate rosters are exactly the kind of personal data (names, emails) a conference
platform shouldn't be casually accumulating server-side. No-persistence-by-default is a privacy
posture as much as an architecture choice, and it's hard to walk back later — the moment a backend
store exists, Motion is a system that retains delegate PII, which is a materially different
product to explain and to secure. Cloud Sessions (opt-in, Firestore-backed) are the deliberate
escape hatch for chairs who need cross-device sync, not the default.
