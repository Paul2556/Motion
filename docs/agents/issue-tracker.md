# Issue tracker: .claude/issues.md (## Tickets section)

Feature/bug tickets for `/triage`, `/to-tickets`, `/to-spec`, and `/wayfinder` live in the
`## Tickets` section of `.claude/issues.md` — not a separate file. That file also holds review
findings (`## Security`, `## Design`, `## Accessibility`, `## Docs`, `## Verification`) written by
this repo's four read-only review subagents; the two kinds of content use different formats and
different numbering, kept in their own sections. Don't mix a ticket into a review section or vice
versa.

`## Tickets` follows the mattpocock-skills local-file convention adapted to a single section
(matching how `roadmap.md` and `issues.md` are each already one file, not one-file-per-item):

## Conventions

- Every ticket is a `## <NN> — <Title>` heading within the `## Tickets` section, numbered from `01`
  in dependency order (blockers first).
- Each heading is immediately followed by:

  ```
  **Status:** needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix
  **Category:** bug | enhancement
  **Blocked by:** None | <NN>, <NN>
  ```

- Body: what to build or what's broken, from the user's perspective.
- Comments/triage notes append under a `#### Comments` sub-heading at the bottom of the ticket's
  section, oldest first.
- Closed tickets stay in the file with an updated `Status:` — it's history, not a scratch pad.

## When a skill says "publish to the issue tracker"

Append a new `## <NN> — <Title>` heading to the end of the `## Tickets` section in
`.claude/issues.md`, numbered one past the highest existing ticket number.

## When a skill says "fetch the relevant ticket"

Find the matching `## <NN> — <Title>` heading within `## Tickets` by number or title.

## Wayfinding operations

Used by `/wayfinder`, same section:

- **Map**: a `## Map — <effort>` heading (Notes / Decisions-so-far / Fog).
- **Child ticket**: a normal `## <NN> — <Title>` heading with `Type:` (`research` / `prototype` /
  `grilling` / `task`) and `Status:` (`claimed` / `resolved`) alongside the usual metadata.
- **Blocking**: the `Blocked by:` line; unblocked once every listed issue is `resolved`.
- **Frontier**: scan `## Tickets` for open, unblocked, unclaimed sections; lowest number wins.
- **Claim**: set `Status: claimed` before starting work.
- **Resolve**: append the answer under `#### Answer`, set `Status: resolved`, then append a short
  pointer to the map's Decisions-so-far.

## PRs as a request surface

Off. Solo-maintained; `/triage` only ever looks at the `## Tickets` section.
