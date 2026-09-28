---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits. For improvements to the repo's environment instead (lint rules, CI, CLAUDE.md, navigation pointers), use `retro`.

## When to invoke

- The user said "reflect" or "/reflect".
- A complex task (5+ tool calls) just landed cleanly and the recipe is worth keeping.
- The agent hit dead ends, found the working path, and the path generalizes.
- The user corrected the agent's approach mid-task.
- A non-trivial workflow emerged that isn't captured anywhere.

Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. Claude Code stores transcripts under `~/.claude/projects/<slug>/`, where `<slug>` is the working directory with every `/` replaced by `-` (`/Users/me/proj` → `-Users-me-proj`). Stay inside that one slug directory. Globbing across `~/.claude/projects/*/` crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t ~/.claude/projects/<slug>/*.jsonl ~/.claude/projects/<slug>/*/subagents/*.jsonl 2>/dev/null | head -10
```

Two layouts: the session (`<session-id>.jsonl`) and its subagents (`<session-id>/subagents/agent-<id>.jsonl`).

For each candidate, find the first line with `"type":"user"` and check that its `message.content` text contains the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three `Agent` calls, `subagent_type: general-purpose`, explicit `model:` on each. Reviewers keep full tool access so they can look up context referenced in the transcript (tickets, PRs, chat threads) through MCP. The prompt forbids file writes; the parent applies edits.

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | `opus` | `references/judgment-reviewer.md` |
| Tooling | `opus` | `references/tooling-reviewer.md` |
| Divergent | `sonnet` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Run them in the foreground (`run_in_background: false`), since synthesis needs all three.

### 3. Synthesize

One `Agent` call, `subagent_type: general-purpose`, `model: opus`. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer spot-verifies citations and returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, hook, or metadata flag, move it from Accepted to Backlog. The synthesizer already applies this criterion; this is a final pass before edits land. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future session; do not auto-apply.

For each approved Accepted item, follow the Routing field exactly. Load `writing-for-agents` before touching any skill text.

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the `skill-creator` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

Edits to plugin-installed skills (under `~/.claude/plugins/cache/`) are overwritten on update. Route those to a local override in `~/.claude/skills/` or to Backlog as an upstream suggestion.

For each approved Backlog item, ask the user where it lands: a hook via the `update-config` skill, a repo lint rule or CI check, or a GitHub issue. Filing an issue is outward-facing; confirm the repo and text first.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog: `<item>` → `<where it landed>`. One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
