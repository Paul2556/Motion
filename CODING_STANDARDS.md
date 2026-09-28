# Coding standards

Read during review, not implementation. The `code-review` and `interrogate` reviewers check diffs against this file.

Project conventions live here, not in `CLAUDE.md`: visual style, UI copy, naming, cross-file consistency, "matches the surrounding style". `CLAUDE.md` loads into every session, so it keeps only what an agent needs to act (commands, where things live, how to work). Anything a reviewer can check after the fact belongs here instead.

Only judgement calls belong here. A rule a linter, type checker, or CI job could enforce goes into that tool instead (see the `principle-encode-lessons-in-structure` skill). Link to docs rather than inlining them once this file passes a few hundred lines.

## Rules

<!-- Add a rule the first time a reviewer should have caught something and didn't, or when you'd otherwise write a convention into CLAUDE.md. -->

### Comments

- Keep comments short and sparse: at most 2 sentences, never a paragraph.
- Only comment on a non-obvious *why* (a hidden constraint, a bug workaround, a subtle invariant). Never restate what the code already says.

### UI copy

- Never use all-caps subtitles, anywhere.
