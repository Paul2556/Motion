# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Motion is a committee management platform for Model United Nations (MUN) conferences — delegate
import, attendance, speaker queue/timer, and voting, replacing the spreadsheets/timers/manual vote
counts chairs currently juggle across multiple tools. React + Vite + Tailwind, client-side only
(no backend): a conference is loaded from an uploaded `.xlsx` and lives only in memory for that
tab's session. See `README.md` for brand/vision context (tagline, roadmap phases).

## Code style

Keep comments short and sparse. Only comment on non-obvious *why* (a hidden constraint, a bug
workaround, a subtle invariant) — never restate what the code already says. Don't add a paragraph to your comments, keep it at most 2 sentences.

## Commands

```
npm run dev       # start Vite dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview a production build
npm run lint      # eslint . --max-warnings 0 (zero warnings allowed)
vite # only use this when starting the normal vite server, used after every message that changes the code
```

There is no test suite/runner configured in this repo yet.

Node version is pinned via `.nvmrc` (24). CI (`.github/workflows/ci.yml`) runs `npm ci` + `npm run
build` on Node 22 for every push/PR to main/master. Deploys to Vercel (served from the domain root,
not a subpath) — `vercel.json` has the SPA rewrite (`/(.*)` → `/index.html`) so client-side routes
like `/session` don't 404 on a direct link or refresh.

## Architecture

### Routing

Single `<Routes>` table in `src/App.jsx`, one top-level page component per route: `/` (Landing),
`/home`, `/session`, `/motion`, `/settings`, `/debug`. Pages are flat, not nested — there's no
shared layout wrapper; each page composes its own header and imports what it needs.

### Data flow: upload → parse → session state

```
.xlsx File → AllocationParser (stateless) → ConferenceService (singleton, in-memory) → pages
```

- **`src/services/AllocationParser.js`** is a stateless parser (`new AllocationParser().load(file)`)
  that reads an Excel workbook with ExcelJS and extracts per-sheet `{ id, title, topic, chairs,
  delegates, pages }`. It's tolerant of structural variation across different conferences' Excel
  templates (offset columns, merged title cells, shared vs. per-role headers, French-language
  headers, fill-down stance columns) — see the extensive inline comments in that file before
  changing header/vocabulary detection, since most branches exist to handle one specific real
  workbook layout that would otherwise silently misparse.
  - It was ported from a standalone sibling tool (`excelToJson/`, outside this repo) that uses
    SheetJS. This copy deliberately still uses **ExcelJS** (already a dependency here via
    `ConferenceService`) instead, to avoid shipping two spreadsheet-parsing libraries in the
    bundle. **This file must stay self-contained — never import from the sibling `excelToJson`
    project at runtime**; if the parsing logic changes there, port the change by hand.
  - Country name matching, chair/page keyword vocab, and header-field vocab live in
    `src/constants.js` (`countries`, `CHAIR_WORDS`, `PAGE_WORDS`, `SKIP_SHEETS`, `NAME_WORDS`,
    `EMAIL_WORDS`, `TOPIC_WORDS`) — this is the single source of truth for that data; don't
    reintroduce a second copy.
- **`src/services/ConferenceService.js`** is a singleton (module exports one instance, not the
  class) holding the currently loaded conference **in memory only** — nothing is persisted beyond
  the page's lifetime (by design: closing the tab leaves no trace of delegate data). It calls
  `AllocationParser`, reshapes each parsed sheet into a committee record via `buildCommittee`
  (adding session-tracking fields `present`/`voting`/`hasSpoken`/`speakingTime`/`notes` that
  `AllocationParser` has no reason to know about), and exposes the full session API pages consume:
  active-committee selection, delegate search/filtering, attendance/speaking-time mutation,
  aggregate statistics, and `validateConference()`.
- **`src/pages/DebugPage.jsx`** is a dev-only tool that loads a workbook through both
  `AllocationParser` (raw output) and `ConferenceService` (processed output) side by side, for
  comparing what each layer changes.

### Theming — two independent systems, don't cross-wire them

There are deliberately two separate light/dark mechanisms, because `LandingPage` and the rest of
the app have opposite native colors:

- **LandingPage** (natively light) manages its own state locally: `localStorage` keys
  `motion-theme`/`motion-reduced`, applied via a `.theme-shell`/`.theme-dark` class + `data-theme`
  attribute scoped to that page.
- **Every other page** (natively dark) uses `src/appTheme.js`
  (`getAppTheme`/`setAppTheme`/`getAppReducedMotion`/`setAppReducedMotion`/`initAppTheme`,
  called once in `main.jsx`), backed by its own `localStorage` keys `app-theme`/
  `app-reduced-motion`, applied via `data-app-theme`/`data-app-reduced-motion` attributes on
  `<html>`. A page opts in by adding the `app-shell` class to its root element (see `themes.css`).

Both use the same underlying trick — **`filter: invert(1)`** as a cheap full-page light/dark flip
— which means any hand-picked hue (an accent color, the timer ring color) gets visually flipped to
its complementary color too. Where a specific hue must look the same in both modes, the fix is a
CSS custom property with a pre-computed inverse value for the inverted state, not a conditional in
JS — see `--accent`/`--accent-rgb` (`.theme-shell.theme-dark` in `themes.css`) and
`--timer-remaining` (`.app-shell` vs. `html[data-app-theme="light"] .app-shell`). If you add a new
hardcoded color inside `.app-shell`/`.theme-shell`, decide up front whether it should flip with the
theme (leave it) or stay put (give it a pre-inverted CSS var pair like the above).

Reduced motion is applied globally as `transition: none !important; animation: none !important`
scoped to `.app-shell` — with one carve-out: elements marked `data-motion-exempt` (currently the
Settings toggle's own knob) are excluded, because the attribute is set synchronously on click,
before React re-renders, and without the exemption the toggle's own click-feedback animation would
be the one thing reduced motion silently breaks.

### Components worth knowing before touching

- **`src/components/Timer.jsx`** drives its countdown ring via `requestAnimationFrame` and a
  wall-clock anchor (`{ time, value }`, re-anchored whenever `running`/`seconds` changes) rather
  than `setInterval` — a once-a-second interval can only ever interpolate between two stale
  snapshots, so continuous real-time recomputation was needed for a genuinely smooth ring. The
  `onComplete` callback is captured in a ref specifically so the animation effect doesn't restart
  every render just because a caller passed a fresh inline arrow function.
- **`src/components/SeatChart.jsx`** renders a semicircular parliamentary hemicycle (concentric
  arc rows, seat count per row proportional to that row's radius) with a dashed majority-threshold
  line. The line is built per-row (`rowGapAngle`), not from one global angle, because different
  rows have different seat spacing — a single global angle would cut through seats in rows whose
  spacing doesn't happen to line up. The threshold sits at `floor(totalSeats/2) + 1` seats (a
  simple majority), positioned so that seat is the first one to land on the "passed" side of the
  line, not one seat later.
- **`src/components/Queue.jsx`** is a plain controlled list (`queue`/`setQueue` props) — no
  internal fetch/service coupling, so it's reusable anywhere a reorderable speaker list is needed.
