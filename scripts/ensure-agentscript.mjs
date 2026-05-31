#!/usr/bin/env node
// Ensures a built @agentscript/agentforce toolchain is available for Ohana.
//
// @agentscript/agentforce is not on npm yet, so Ohana builds it from source.
// Resolution order:
//   1. OHANA_AGENTSCRIPT_ENTRY env var (a prebuilt dist/index.js)        -> done
//   2. An existing build in a sibling sf-repos/agentscript checkout      -> done
//   3. An existing build in the repo-local .agentscript cache            -> done
//   4. Otherwise: clone salesforce/agentscript into .agentscript and build it
//
// Env overrides:
//   OHANA_AGENTSCRIPT_ENTRY  Absolute path to a prebuilt dist/index.js (skips all of the below)
//   OHANA_AGENTSCRIPT_REPO   Git URL to clone (default: https://github.com/salesforce/agentscript)
//   OHANA_AGENTSCRIPT_REF    Git ref/tag/sha to check out (default: main — PIN THIS for reproducible CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ohanaRoot = path.resolve(__dirname, "..");

const REPO = process.env.OHANA_AGENTSCRIPT_REPO ?? "https://github.com/salesforce/agentscript";
const REF = process.env.OHANA_AGENTSCRIPT_REF ?? "main";

// The packages that must be built (in order) to produce the agentforce dist.
const BUILD_FILTERS = [
  "./packages/types",
  "./packages/parser-javascript",
  "./packages/parser",
  "./packages/language",
  "./dialect/agentscript",
  "./dialect/agentforce",
  "./dialect/agentfabric",
  "./packages/compiler",
  "./packages/agentforce",
];

const distRelative = "packages/agentforce/dist/index.js";

function distIn(repoDir) {
  return path.join(repoDir, distRelative);
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\nCommand failed (exit ${result.status ?? "?"}): ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

// 1. Explicit prebuilt entry wins.
if (process.env.OHANA_AGENTSCRIPT_ENTRY) {
  const entry = path.resolve(process.env.OHANA_AGENTSCRIPT_ENTRY);
  if (fs.existsSync(entry)) {
    console.log("agentscript: using OHANA_AGENTSCRIPT_ENTRY", entry);
    process.exit(0);
  }
  console.error("OHANA_AGENTSCRIPT_ENTRY set but file not found:", entry);
  process.exit(1);
}

// 2 & 3. Reuse an existing build if one is already present.
const siblingRepo = path.resolve(ohanaRoot, "..", "sf-repos", "agentscript");
const cacheRepo = path.join(ohanaRoot, ".agentscript");

for (const repoDir of [siblingRepo, cacheRepo]) {
  if (fs.existsSync(distIn(repoDir))) {
    console.log("agentscript: OK", distIn(repoDir));
    process.exit(0);
  }
}

// 4. Clone (if needed) into the repo-local cache, then build.
if (!fs.existsSync(path.join(cacheRepo, ".git"))) {
  if (REF === "main") {
    console.warn(
      "\n⚠  Cloning salesforce/agentscript at 'main' (unpinned). " +
        "Set OHANA_AGENTSCRIPT_REF to a tag or commit SHA for reproducible builds.\n",
    );
  }
  console.log(`Cloning ${REPO} @ ${REF} into ${cacheRepo} ...`);
  fs.mkdirSync(cacheRepo, { recursive: true });
  run("git", ["clone", "--filter=blob:none", REPO, cacheRepo], ohanaRoot);
  run("git", ["checkout", REF], cacheRepo);
}

console.log("Installing agentscript dependencies ...");
run("pnpm", ["install", "--frozen-lockfile"], cacheRepo);

console.log("Building @agentscript/agentforce (javascript parser) ...");
for (const filter of BUILD_FILTERS) {
  run("pnpm", ["--filter", filter, "build"], cacheRepo);
}

if (!fs.existsSync(distIn(cacheRepo))) {
  console.error("Expected agentforce dist at", distIn(cacheRepo));
  process.exit(1);
}

console.log("agentscript: built", distIn(cacheRepo));
