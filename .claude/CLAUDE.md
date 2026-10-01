# Motion

Committee management platform for Model United Nations conferences: delegate import, attendance, speaker queue/timer, and voting. React + Vite + Tailwind, with Firebase for sign-in and Cloud Sessions.

## Commands

- Install: `nub install` (nub mirrors the existing `package-lock.json`)
- Dev: `nub run dev` (Vite dev server; start it after every message that changes the code)
- Test: none yet, no test runner is configured
- Check (lint): `nub run lint` (`eslint . --max-warnings 0`, zero warnings allowed)
- Build: `nub run build` (outputs to `dist/`); `nub run preview` serves a production build

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

- Track a big task (three or more verifiable units, or a `/goal`) on the issue tracker with the `track-big-tasks` skill.
- Before a big decision (a new feature, architecture, data model, library or stack choice, anything expensive to undo), run the `mattpocock-skills:grilling` skill (what `/mattpocock-skills:grill-me` runs) until you and the user agree on the plan. Skip it if told to. When the user is away and can't answer, follow the `autonomous-building` skill instead. Use `/mattpocock-skills:grill-with-docs` when the terms and decisions should be written down.
- Build features and fix bugs test-first with the `mattpocock-skills:tdd` skill. Skip it for tiny tweaks, and for how UI looks, which the user judges by eye.
- Before calling a task done, prove it works against the real artifact (`principle-prove-it-works`).
- Write PR bodies with the `pr` skill.
- Read a file before overwriting or rewriting it, and keep what's there unless told to remove it. This includes `CLAUDE.md`, `ROADMAP.md`, and issue files, which often hold far more than you expect.
- Never write em dashes (U+2014) anywhere: code, comments, docs, UI copy, commit messages, PR bodies. Use a comma, colon, period, or parentheses.
- Never use the `fable` model, including for subagents and skills that suggest it. Use `opus` or `sonnet`.
- Default subagents to `sonnet` (Sonnet 5.5). Use `opus` only as the second model when a skill wants different models to cross-check each other.
- Don't use the AskUserQuestion tool. Put choices in a normal message as a numbered list with your recommendation, so they can be answered by typing or dictating.

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

## Agent skills

### Issue tracker

Feature/bug tickets live in the `## Tickets` section of `.claude/issues.md`, alongside (but
formatted separately from) the review-subagent findings sections. The file is gitignored, so it
stays on this machine (the repo is public). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary, used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, but relocated to match this repo's `.claude/`-centralized convention:
`.claude/CONTEXT.md` and `.claude/adr/`, not the repo root. See `docs/agents/domain.md`.
