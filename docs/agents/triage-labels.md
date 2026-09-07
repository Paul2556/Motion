# Triage Labels

Default vocabulary, used as-is — no existing label system to reconcile against (the SEC-/DES-/ACC-/
DOC-/VER- IDs in `.claude/issues.md`'s review-findings sections are a separate scheme for a
separate purpose; see `docs/agents/issue-tracker.md`).

| Canonical role    | Meaning                                  |
| ------------------ | ----------------------------------------- |
| `needs-triage`     | Maintainer needs to evaluate this issue  |
| `needs-info`       | Waiting on reporter for more information |
| `ready-for-agent`  | Fully specified, ready for an AFK agent  |
| `ready-for-human`  | Requires human implementation            |
| `wontfix`          | Will not be actioned                     |
