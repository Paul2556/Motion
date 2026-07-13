#!/usr/bin/env node
// Packages a clean tagged snapshot of the source - never the live working
// tree - as the base archive api/source/download.js watermarks per download.
// Runs as part of `vercel-build` (see package.json); `vercel dev` does NOT
// run vercel-build, so run this manually first when testing locally.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const REPO_OWNER = "Paul2556";
const REPO_NAME = "Motion";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(repoRoot, "api", "source", "_archive");
const outputPath = join(outputDir, "base.zip");

const tag = process.env.SOURCE_RELEASE_TAG;
const githubToken = process.env.GITHUB_TOKEN;

if (!tag) {
  console.warn(
    "[build-source-archive] SOURCE_RELEASE_TAG is not set - falling back to HEAD. " +
      "Production deploys must set this env var to a real release tag."
  );
}

mkdirSync(outputDir, { recursive: true });

// Vercel's build checkout is a shallow, single-commit clone with no usable
// "origin" remote - `git archive <tag>`/`git fetch` can't reach the tag at
// all there, even though it's pushed to GitHub. So a tagged build downloads
// the tag's zipball straight from the GitHub API instead of touching local
// git. (Untagged/local-dev builds still just archive HEAD, which is always
// present in whatever clone is running the script.)
if (tag && githubToken) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/zipball/${tag}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "motion-build-source-archive",
    },
  });

  if (!res.ok) {
    throw new Error(
      `[build-source-archive] GitHub API returned ${res.status} fetching tag "${tag}" - ` +
        `check GITHUB_TOKEN has read access to ${REPO_OWNER}/${REPO_NAME} and that the tag exists.`
    );
  }

  const zip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));
  const outZip = new JSZip();

  // GitHub's zipball nests every entry under one synthetic top-level folder
  // (e.g. "Motion-<sha>/") - stripped here so the archive's layout matches
  // plain `git archive` output, which download.js's watermarking assumes
  // (e.g. looking up "LICENSE" at the archive root).
  const entries = Object.values(zip.files).filter((file) => !file.dir);
  await Promise.all(
    entries.map(async (file) => {
      const strippedName = file.name.replace(/^[^/]+\//, "");
      if (!strippedName) return;
      outZip.file(strippedName, await file.async("nodebuffer"));
    })
  );

  writeFileSync(outputPath, await outZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`[build-source-archive] Wrote ${outputPath} from tag "${tag}" via GitHub API`);
} else {
  if (tag) {
    console.warn(
      "[build-source-archive] GITHUB_TOKEN is not set - falling back to local `git archive`, " +
        "which only works if this clone actually has that tag (true for local dev, not Vercel builds)."
    );
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
        `[build-source-archive] Failed to archive tag "${tag}" locally - ` +
          `set GITHUB_TOKEN so production builds can fetch it from GitHub instead.`
      );
    }
    throw error;
  }

  console.log(`[build-source-archive] Wrote ${outputPath} from ${tag || "HEAD"} via local git`);
}
