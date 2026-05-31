#!/usr/bin/env node
import { checkCommand } from "../commands/check.js";
import { lintCommand } from "../commands/lint.js";
import { simCommand } from "../commands/sim.js";

const HELP = `ohana — CI tooling for Salesforce Agent Script / Agentforce DX

Usage:
  ohana lint [options]     Parse, lint, and compile .agent files
  ohana sim [options]      Run offline scenario simulations
  ohana check [options]    lint + sim (default CI entry)

Options (lint / check):
  --path <dir>             Project root (default: cwd or .ohana/config.yaml)
  --format <text|json|sarif>  Output format (default: text). sarif: GitHub code scanning (lint)
  --fail-on-warning        Exit non-zero on warnings
  --agentscript <path>     Path to @agentscript/agentforce dist/index.js
  --skip-sim               For check: run lint only

Options (sim):
  --path <dir>             Project root containing scenarios/ (default: cwd)

Examples:
  ohana lint
  ohana sim --path examples/testdrive-ci
  ohana check --path examples/testdrive-ci
  ohana lint --format json --fail-on-warning
`;

function parseArgs(argv: string[]) {
  const args = [...argv];
  const command = args.shift();

  if (!command || command === "-h" || command === "--help" || command === "help") {
    return { command: "help" as const, options: {} as Record<string, string | boolean> };
  }

  const options: Record<string, string | boolean> = {};

  while (args.length > 0) {
    const token = args.shift();
    if (!token) break;

    if (token === "-h" || token === "--help") {
      return { command: "help" as const, options: {} };
    }

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = args[0];
      if (next && !next.startsWith("-")) {
        options[key] = args.shift()!;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

function sharedOptions(options: Record<string, string | boolean>) {
  return {
    path: typeof options.path === "string" ? options.path : undefined,
    format:
      options.format === "json"
        ? ("json" as const)
        : options.format === "sarif"
          ? ("sarif" as const)
          : ("text" as const),
    failOnWarning: options["fail-on-warning"] === true,
    agentScriptEntry:
      typeof options.agentscript === "string" ? options.agentscript : undefined,
  };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help") {
    console.log(HELP);
    process.exit(0);
  }

  const shared = sharedOptions(options);

  if (command === "lint") {
    process.exit(await lintCommand(shared));
  }

  if (command === "sim") {
    process.exit(await simCommand(shared));
  }

  if (command === "check") {
    process.exit(
      await checkCommand({
        ...shared,
        skipSim: options["skip-sim"] === true,
      }),
    );
  }

  console.error(`Unknown command: ${command}\n`);
  console.error(HELP);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
