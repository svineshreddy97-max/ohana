#!/usr/bin/env node
/**
 * Create a git commit without trailer lines (Co-authored-by, Signed-off-by, etc.).
 *
 * Usage:
 *   node scripts/git-commit.mjs -m "subject" -m "optional body"
 *   node scripts/git-commit.mjs --amend -m "subject" -m "optional body"
 *   node scripts/git-commit.mjs --amend   # re-commit with cleaned message from HEAD
 *
 * Pass any other git commit flags before -m (e.g. --no-edit is not supported with -m).
 */

import { spawnSync } from "node:child_process";

const TRAILER =
  /^(Co-authored-by|Signed-off-by|Reviewed-by|Acked-by|Tested-by|Reported-by|Fixes|Refs):/i;

/** Drop trailer lines and the blank line block that precedes them. */
export function stripTrailers(text) {
  const lines = text.split(/\r?\n/);
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  while (end > 0 && TRAILER.test(lines[end - 1].trim())) end--;
  while (end > 0 && lines[end - 1].trim() === "") end--;
  return lines.slice(0, end).join("\n").trimEnd();
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "git failed\n");
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function readHeadMessage() {
  return git(["log", "-1", "--format=%B"]).replace(/\r?\n$/, "");
}

function parseArgs(argv) {
  const gitArgs = ["commit"];
  const messages = [];
  let amend = false;
  let amendOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--amend") {
      amend = true;
      gitArgs.push("--amend");
      continue;
    }
    if (arg === "-m" || arg === "--message") {
      const value = argv[++i];
      if (value === undefined) {
        console.error("missing value for -m");
        process.exit(1);
      }
      messages.push(stripTrailers(value));
      continue;
    }
    gitArgs.push(arg);
  }

  if (amend && messages.length === 0) {
    amendOnly = true;
    messages.push(stripTrailers(readHeadMessage()));
  }

  if (messages.length === 0) {
    console.error("Provide at least one -m message, or use --amend to reuse HEAD.");
    process.exit(1);
  }

  for (const message of messages) {
    gitArgs.push("-m", message);
  }

  return { gitArgs, amendOnly };
}

const { gitArgs } = parseArgs(process.argv.slice(2));
const result = spawnSync("git", gitArgs, { stdio: "inherit" });
process.exit(result.status ?? 1);
