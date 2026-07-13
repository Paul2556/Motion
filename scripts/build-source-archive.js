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

try {
  execFileSync(
    "git",
    ["archive", "--format=zip", `--output=${outputPath}`, tag || "HEAD"],
    { cwd: repoRoot, stdio: "inherit" }
  );
} catch (error) {
  if (tag) {
    console.error(
      `[build-source-archive] Failed to archive tag "${tag}" - does it exist? ` +
        `Run: git tag ${tag} && git push origin ${tag}`
    );
  }
  throw error;
}

console.log(`[build-source-archive] Wrote ${outputPath} from ${tag || "HEAD"}`);
