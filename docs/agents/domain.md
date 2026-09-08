# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

## Location override

This repo keeps all agent-facing meta-docs under `.claude/` (`motion.md`, `roadmap.md`,
`issues.md`, `repoMap.md`) rather than at the repo root — see `.claude/CLAUDE.md`'s "Agent memory"
section. `CONTEXT.md` and ADRs follow that same convention instead of the skill's repo-root
default:

- **Glossary**: `.claude/CONTEXT.md` (not root `CONTEXT.md`)
- **Decisions**: `.claude/adr/0001-slug.md`, `0002-slug.md`, … (not root `docs/adr/`)

Single-context — no `CONTEXT-MAP.md`, no per-context split.

## Before exploring, read these

- **`.claude/CONTEXT.md`**
- **`.claude/adr/`**: read ADRs that touch the area you're about to work in
- **`.claude/motion.md`**: broader product/feature context that `CONTEXT.md` deliberately doesn't
  duplicate — `CONTEXT.md` is a terse glossary of canonical terms, `motion.md` is the full
  feature-by-feature definition of the product. Read `motion.md` for "what does this feature do,"
  `CONTEXT.md` for "what's the right word for this concept."

If any of these are missing something you need, proceed silently — don't flag the absence.
`/domain-modeling` (via `/grill-with-docs`, `/improve-codebase-architecture`, or triggered
automatically by terminology discussion) creates and edits them lazily, the moment a term or
decision actually resolves.

## Use the glossary's vocabulary

Use the term as defined in `.claude/CONTEXT.md` — e.g. "Cloud Session" for the Firestore-synced
feature, never bare "session," and never unqualified "Motion" when either the app or the
procedural term could be meant. Don't drift to a synonym listed under `_Avoid_`.

## Flag ADR conflicts

If output contradicts an existing ADR (e.g. proposing server-side roster persistence, or importing
`excelToJson` at runtime into `AllocationParser`), surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0001 (client-side-only conference data), but worth reopening because…_
