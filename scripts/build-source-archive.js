#!/usr/bin/env node
// Packages a clean tagged snapshot of the source - never the live working
// tree - as the base archive api/source/download.js watermarks per download.
// Runs as part of `vercel-build` (see package.json); `vercel dev` does NOT
// run vercel-build, so run this manually first when testing locally.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(repoRoot, "api", "source", "_archive");
const outputPath = join(outputDir, "base.zip");

const tag = process.env.SOURCE_RELEASE_TAG;

if (!tag) {
  console.warn(
    "[build-source-archive] SOURCE_RELEASE_TAG is not set - falling back to HEAD. " +
      "Production deploys must set this env var to a real release tag."
  );
}

mkdirSync(outputDir, { recursive: true });

// Vercel's build clone is shallow and single-commit (no tag refs), so the
// tag can exist on the remote yet still be unresolvable here - fetch it
// explicitly before archiving rather than assuming it's already present.
if (tag) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", tag], { cwd: repoRoot, stdio: "ignore" });
  } catch {
    try {
      execFileSync("git", ["fetch", "--depth=1", "origin", `refs/tags/${tag}:refs/tags/${tag}`], {
        cwd: repoRoot,
        stdio: "inherit",
      });
    } catch {
      console.error(
        `[build-source-archive] Could not fetch tag "${tag}" from origin - ` +
          `confirm it's pushed with: git ls-remote --tags origin`
      );
    }
  }
}

try {
  execFileSync(
    "git",
    ["archive", "--format=zip", `--output=${outputPath}`, tag || "HEAD"],
    { cwd: repoRoot, stdio: "inherit" }
  );
} catch (error) {
  if (tag) {
    console.error(
      `[build-source-archive] Failed to archive tag "${tag}" - does it exist locally after fetch? ` +
        `Verify with: git tag -l "${tag}"`
    );
  }
  throw error;
}

console.log(`[build-source-archive] Wrote ${outputPath} from ${tag || "HEAD"}`);
