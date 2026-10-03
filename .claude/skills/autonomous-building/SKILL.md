---
name: autonomous-building
description: "Build while the user is away and can't answer questions: grill yourself and take your own recommended answers, keep subjective choices cautious, verify everything, and hand the subjective calls back as open questions at the end. Use for /autonomous-building, or when the user says they're away, AFK, asleep, or unavailable for questions."
---

# Autonomous Building

The user is away until you finish. Every decision still gets made with the same rigor as a supervised session; you answer the questions yourself, and the user reviews your answers afterward.

## 1. Grill yourself

Run the `mattpocock-skills:grilling` skill as normal: build the design tree, work it in rounds, give a recommended answer to every question. Then take your recommended answer and move to the next round instead of waiting. Keep going until the frontier is empty.

Find facts yourself (code, docs, tools, a quick measurement), as grilling already requires. Your recommendation on a question of fact should rest on something you looked up.

As you take each answer, tag it:

- **objective**: settled by a fact, a test, a measurement, or a convention the codebase already follows.
- **subjective**: the user's taste or product direction. Visual style, UI copy, user-facing names, feature scope, UX flow, a library or stack choice with no clear winner, or anything the user might reasonably want done differently.

Keep a running list of every subjective answer: the question, what you picked, why, and the main alternatives. It becomes the open questions at the end.

## 2. Choose cautiously

- Build exactly what was asked, with the smallest change that does it. Leave extra features and refactors for the open questions.
- For a subjective answer, pick the most conventional, least surprising option, and keep it in one place so the user can swap it with a small edit.
- When a subjective decision would be expensive to reverse (a data model, a public API, a stack choice), build everything that doesn't depend on it first. If the rest can't proceed without it, take the most reversible option and flag it at the top of the open questions.
- Keep every action reversible and local. Work on a branch (create one if you're on the default branch), commit each verified unit, and leave pushing, merging, deleting data, publishing, sending messages, and spending money for the user. If the work needs one of those to continue, note it as blocked and carry on with everything else.

## 3. Verify everything

Hold the same bar as a supervised session.

- Build features and fix bugs test-first with the `mattpocock-skills:tdd` skill.
- Work in small units that each end green (`principle-sequence-verifiable-units`), and commit each one.
- Before calling any unit done, prove it against the real artifact (`principle-prove-it-works`): run the tests, the lint and typecheck, and the feature itself.
- For a long or multi-phase run, keep a decision trail with `.claude/skills/show-me-your-work/SKILL.md`.

Done means every unit is verified and committed, and the frontier is empty.

## 4. Hand back

End with one message the user can act on quickly:

1. **Built**: what was done, the branch, and how each part was verified (commands run and their results).
2. **Open questions**: every subjective answer from your list, as a numbered list. For each: the question, what you picked and why, the alternatives, and what changing it would touch. Put expensive-to-reverse ones first. The user answers by number.
3. **Blocked**: anything left for the user (pushes, external actions, decisions nothing could proceed without), each with what's needed to unblock it.
4. **Issues** (when tracking): the main issue's link, and each sub-issue's number, title, and whether it's closed or still open.

## Tracking

For a big task, or when the run was started with `/goal`, track the work with the `track-big-tasks` skill. It's the exception to step 2's "leave publishing for the user". On top of that skill:

- In the main issue's Grill results, mark each answer objective or subjective.
- The main issue's Report is your full step 4 hand-back, and the main issue stays open until the user has answered the open questions.
- Your chat hand-back repeats the whole main issue body (Grill results, Plan, Report), with the main issue's link at the top.
