# Motion

Committee management platform for Model United Nations conferences: delegate import, attendance, speaker queue/timer, and voting. React + Vite + Tailwind, client-side only.

## Commands

- Install: `nub install` (nub mirrors the existing `package-lock.json`)
- Dev: `nub run dev` (Vite dev server; start it with `vite` after every message that changes the code)
- Test: none yet, no test runner is configured
- Check (lint): `nub run lint` (`eslint . --max-warnings 0`, zero warnings allowed)
- Build: `nub run build` (outputs to `dist/`); `nub run preview` serves a production build

Node version is pinned via `.nvmrc` (24). CI (`.github/workflows/ci.yml`) runs `npm ci` + `npm run
build` on Node 22 for every push/PR to main/master. Deploys to Vercel (served from the domain root,
not a subpath). `vercel.json` has the SPA rewrite (`/(.*)` → `/index.html`) so client-side routes
like `/session` don't 404 on a direct link or refresh.

## Node tooling: nub

Use [`nub`](https://github.com/nubjs/nub) and `nubx` for all Node tooling, never `npm`, `npx`, `pnpm`, `yarn`, `tsx`, `ts-node`, `nodemon`, or `nvm`. It's installed on this machine and runs on stock Node. In a repo that already has another lockfile, nub mirrors that package manager's lockfile, so there's nothing to migrate.

| Task | Use | Not |
|---|---|---|
| Install dependencies | `nub install` (`nub ci` for a frozen lockfile) | `npm install`, `pnpm install` |
| Add or remove a dependency | `nub add <pkg>` / `nub remove <pkg>` (same flags as pnpm: `-D`, `-F <workspace>`) | `npm install <pkg>` |
| Run a package.json script | `nub run <script>` | `npm run <script>` |
| Run a script in one workspace | `nub run --workspace <name> <script>` (the flag goes **before** the script) | `npm run -w` |
| Run a TS/JS file | `nub file.ts` | `node`, `tsx`, `ts-node` |
| Run a CLI binary | `nubx <bin>` | `npx <bin>` |
| Watch mode | `nub watch <file>` | `nodemon`, `node --watch` |
| Node version | `nub node` | `nvm`, `fnm`, `volta` |

## Working here

- If a task will require more than 3 changes (files touched, or distinct edits within a file), enter plan mode first rather than making the changes directly.
- Use subagents only for heavy read-only tasks (broad codebase search/exploration, research). Don't delegate edits or writes to subagents in this repo, and minimize other uses where possible.
- Before a big decision (a new feature, architecture, data model, library or stack choice, anything expensive to undo), run the `mattpocock-skills:grilling` skill (what `/mattpocock-skills:grill-me` runs) until you and the user agree on the plan. Skip it if told to. Use `/mattpocock-skills:grill-with-docs` when the terms and decisions should be written down.
- Build features and fix bugs test-first with the `mattpocock-skills:tdd` skill. Skip it for tiny tweaks, and for how UI looks, which the user judges by eye.
- Before calling a task done, prove it works against the real artifact (`principle-prove-it-works`).
- Write PR bodies with the `pr` skill.
- Project conventions (visual style, UI copy, naming, "matches the surrounding style") go in `CODING_STANDARDS.md`, not here. Reviewers enforce it; implementers don't need to read it.
- Read a file before overwriting or rewriting it, and keep what's there unless told to remove it. This includes `CLAUDE.md`, `ROADMAP.md`, and issue files, which often hold far more than you expect.
- Never write em dashes (U+2014) anywhere: code, comments, docs, UI copy, commit messages, PR bodies. Use a comma, colon, period, or parentheses.
- Never use the `fable` model, including for subagents and skills that suggest it. Use `opus` or `sonnet`.
- Don't use the AskUserQuestion tool. Put choices in a normal message as a numbered list with your recommendation, so they can be answered by typing or dictating.

## What this is

Motion is a committee management platform for Model United Nations (MUN) conferences: delegate
import, attendance, speaker queue/timer, and voting, replacing the spreadsheets/timers/manual vote
counts chairs currently juggle across multiple tools. React + Vite + Tailwind, client-side only
(no backend): a conference is loaded from an uploaded `.xlsx` and lives only in memory for that
tab's session. See `README.md` for brand/vision context (tagline, roadmap phases).

## Agent memory

The `.claude/` folder is the Claude agent's memory for this repo. `roadmap.md` in this folder
tracks what's actually implemented vs. planned - keep it current as features land, rather than
relying solely on `README.md`'s roadmap section (which reflects the public-facing pitch, not
day-to-day implementation status).

`motion.md` in this folder is a comprehensive definition of what Motion actually is today - the
product pitch, brand identity, and a full feature-by-feature breakdown of everything implemented.
**Update it in the same change that adds, removes, or meaningfully changes a feature** - treat it
as required maintenance, not optional documentation. It's a snapshot of current functionality, not
a roadmap (that's `roadmap.md`'s job) or a marketing pitch (that's `README.md`'s job).

`repoMap.md` in this folder is a filesystem-level map (directory tree, one-line purpose per file,
size stats) for fast orientation on an unfamiliar part of the repo - read it on demand, not by
default. It's a dated snapshot with no auto-update mechanism, so treat any specific path/line-count
claim in it as provisional and verify before relying on it.

## Architecture

### Routing

Single `<Routes>` table in `src/App.jsx`, one top-level page component per route: `/` (Landing),
`/home`, `/session`, `/motion`, `/settings`, `/debug`. Pages are flat, not nested; there's no
shared layout wrapper; each page composes its own header and imports what it needs.

### Data flow: upload → parse → session state

```
.xlsx File → AllocationParser (stateless) → ConferenceService (singleton, in-memory) → pages
```

- **`src/services/AllocationParser.js`** is a stateless parser (`new AllocationParser().load(file)`)
  that reads an Excel workbook with ExcelJS and extracts per-sheet `{ id, title, topic, chairs,
  delegates, pages }`. It's tolerant of structural variation across different conferences' Excel
  templates (offset columns, merged title cells, shared vs. per-role headers, French-language
  headers, fill-down stance columns). Tread carefully when changing header/vocabulary detection:
  most branches exist to handle one specific real workbook layout that would otherwise silently
  misparse, and the inline comments flag which ones.
  - It was ported from a standalone sibling tool (`excelToJson/`, outside this repo) that uses
    SheetJS. This copy deliberately still uses **ExcelJS** (already a dependency here via
    `ConferenceService`) instead, to avoid shipping two spreadsheet-parsing libraries in the
    bundle. **This file must stay self-contained. Never import from the sibling `excelToJson`
    project at runtime**; if the parsing logic changes there, port the change by hand.
  - Country name matching, chair/page keyword vocab, and header-field vocab live in
    `src/constants.js` (`countries`, `CHAIR_WORDS`, `PAGE_WORDS`, `SKIP_SHEETS`, `NAME_WORDS`,
    `EMAIL_WORDS`, `TOPIC_WORDS`). This is the single source of truth for that data; don't
    reintroduce a second copy.
- **`src/services/ConferenceService.js`** is a singleton (module exports one instance, not the
  class) holding the currently loaded conference **in memory only**: nothing is persisted beyond
  the page's lifetime (by design: closing the tab leaves no trace of delegate data). It calls
  `AllocationParser`, reshapes each parsed sheet into a committee record via `buildCommittee`
  (adding session-tracking fields `present`/`voting`/`hasSpoken`/`speakingTime`/`notes` that
  `AllocationParser` has no reason to know about), and exposes the full session API pages consume:
  active-committee selection, delegate search/filtering, attendance/speaking-time mutation,
  aggregate statistics, and `validateConference()`.
- **`src/pages/DebugPage.jsx`** is a dev-only tool that loads a workbook through both
  `AllocationParser` (raw output) and `ConferenceService` (processed output) side by side, for
  comparing what each layer changes.

### Theming: two independent systems, don't cross-wire them

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

Both use the same underlying trick, **`filter: invert(1)`** as a cheap full-page light/dark flip,
which means any hand-picked hue (an accent color, the timer ring color) gets visually flipped to
its complementary color too. Where a specific hue must look the same in both modes, the fix is a
CSS custom property with a pre-computed inverse value for the inverted state, not a conditional in
JS; see `--accent`/`--accent-rgb` (`.theme-shell.theme-dark` in `themes.css`) and
`--timer-remaining` (`.app-shell` vs. `html[data-app-theme="light"] .app-shell`). If you add a new
hardcoded color inside `.app-shell`/`.theme-shell`, decide up front whether it should flip with the
theme (leave it) or stay put (give it a pre-inverted CSS var pair like the above).

Reduced motion is applied globally as `transition: none !important; animation: none !important`
scoped to `.app-shell`, with one carve-out: elements marked `data-motion-exempt` (currently the
Settings toggle's own knob) are excluded, because the attribute is set synchronously on click,
before React re-renders, and without the exemption the toggle's own click-feedback animation would
be the one thing reduced motion silently breaks.

### Components worth knowing before touching

- **`src/components/Timer.jsx`** drives its countdown ring via `requestAnimationFrame` and a
  wall-clock anchor (`{ time, value }`, re-anchored whenever `running`/`seconds` changes) rather
  than `setInterval`: a once-a-second interval can only ever interpolate between two stale
  snapshots, so continuous real-time recomputation was needed for a genuinely smooth ring. The
  `onComplete` callback is captured in a ref specifically so the animation effect doesn't restart
  every render just because a caller passed a fresh inline arrow function.
- **`src/components/SeatChart.jsx`** renders a semicircular parliamentary hemicycle (concentric
  arc rows, seat count per row proportional to that row's radius) with a dashed majority-threshold
  line. The line is built per-row (`rowGapAngle`), not from one global angle, because different
  rows have different seat spacing; a single global angle would cut through seats in rows whose
  spacing doesn't happen to line up. The threshold sits at `floor(totalSeats/2) + 1` seats (a
  simple majority), positioned so that seat is the first one to land on the "passed" side of the
  line, not one seat later.
- **`src/components/Queue.jsx`** is a plain controlled list (`queue`/`setQueue` props), no
  internal fetch/service coupling, so it's reusable anywhere a reorderable speaker list is needed.

## Agent skills

### Issue tracker

Feature/bug tickets live in the `## Tickets` section of `.claude/issues.md`, alongside (but
formatted separately from) the review-subagent findings sections. See
`docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary, used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, but relocated to match this repo's `.claude/`-centralized convention:
`.claude/CONTEXT.md` and `.claude/adr/`, not the repo root. See `docs/agents/domain.md`.
