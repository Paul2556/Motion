---
name: track-big-tasks
description: "Track a big task on the project's issue tracker like a roadmap: a main issue holding the plan and a final report, with numbered sub-issues linked by blocking edges and closed as each is verified. Use when a task splits into three or more verifiable units, when started with /goal, or when the user asks to track work in issues."
---

# Track Big Tasks

A big task lives on the issue tracker, so the user can see the plan, what's done, and what's left without reading the chat.

## Where

Use the project's tracker as `docs/agents/issue-tracker.md` describes it: GitHub Issues in a private GitHub repo, the local `issues.md` otherwise. Its "Wayfinding operations" section has the operations for linking a child to a parent, adding blocking edges, and resolving, fallbacks included. Treat the main issue as the map, and skip the `wayfinder:` labels.

On GitHub, first confirm the repo is still private: `gh repo view --json visibility -q .visibility` prints `PRIVATE`. If it doesn't, create no issues, tell the user, and suggest rerunning Kit's `adopt.sh` on the project to switch it to a local `issues.md`.

A run started with `/goal` tracks only on GitHub Issues in a private repo. Anywhere else (a public repo, no GitHub remote, `gh` can't read it, or the project uses `issues.md`), create no issues for it, and say why at the top of the final report in chat.

Creating, editing, commenting on, and closing these issues is part of the task. Do it without asking.

## Steps

1. Once the plan is settled (after grilling, if there was any), pick a 2-3 word label for the task and split it into verifiable units (`principle-sequence-verifiable-units`).
2. Create the **main issue**, titled with the label alone (for example, `Offline sync`). Its body has two sections:
   - **Grill results**: every question settled while grilling and the answer taken. Leave this section out if there was no grilling.
   - **Plan**: what you'll build, and the sub-issues in build order.
3. Create one **sub-issue** per unit, linked to the main issue, titled exactly `<what this issue does toward the task> <x>/<N>`, where `x` is the unit's position in build order and `N` is the task's sub-issue count. For example, `Queue writes while offline 2/5`. The body says what the unit does and how it will be verified.
4. Add a blocking edge from each sub-issue to every sub-issue it depends on. Work only on unblocked sub-issues.
5. Every piece of work belongs to one sub-issue. Work that fits none gets a new one.
6. When the plan changes, add or drop sub-issues, retitle the rest (closed ones included) so every `x/N` stays in build order and `N` is the current total, and update the blocking edges and the main issue's Plan.
7. When a unit is verified and committed, close its sub-issue with a comment giving the commit SHA and the verification you ran. A sub-issue that's blocked or unfinished stays open with a comment saying why.
8. At the end, add a **Report** section to the main issue: what was built, how it was verified, and anything left for the user. Close the main issue when every sub-issue is closed and nothing is left for the user; otherwise leave it open.
