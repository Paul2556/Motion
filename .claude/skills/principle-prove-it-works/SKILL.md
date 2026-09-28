---
name: principle-prove-it-works
description: "Verify against the real artifact before declaring a task done: run the feature, read the actual value, inspect the diff. Use when finishing any code change, reporting delegated work, or about to say 'done', 'fixed', or 'works'."
---

# Prove It Works

Verify every task output by checking the real thing directly: the running feature, the actual value, the diff.

**Why:** Unverified work has unknown correctness. Indirect verification (file mtimes, output freshness, agent self-reports, cached screenshots) feels cheaper than direct observation. Acting on a wrong inference costs far more than checking the source.

**Pattern:** After completing any task, ask: "how do I prove this actually works?"

Check the real thing:
- Check process liveness directly, through the process itself
- Read the actual value at its source
- When verification fails, suspect the observation method before suspecting the system

Code and features:
1. Build it (necessary but not sufficient)
2. Run it and exercise the actual feature path
3. Check the full chain: does data flow from input to output?
4. For integrations, test the full communication path end-to-end

Delegation: trust artifacts over self-reports.
When verifying delegated work, inspect the actual output artifact (git diff, file contents, runtime behavior). Agents report what they intended, not always what happened.

## Script the check when you can

The strongest proof is a deterministic script that re-runs the same comparison. Write the script, run it, and keep its output as an artifact a reviewer can re-run instead of trusting your word. A script comparing the old and new compiled output catches what a glance misses.

Keep the artifact visible for the human. For work that ships as a PR, put the before/after output in the **Evidence** section of the `pr` skill's template. Commit it only for large or complex work where the trail has to be auditable later, like a big port or migration (the **show-me-your-work** skill).
