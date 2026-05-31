#!/usr/bin/env node
import { checkCommand } from "../commands/check.js";
import { lintCommand } from "../commands/lint.js";
import { simCommand } from "../commands/sim.js";
import { getVersion, parseArgs, sharedOptions } from "../args.js";

const HELP = `ohana — CI tooling for Salesforce Agent Script / Agentforce DX

Usage:
  ohana lint [options]     Parse, lint, and compile .agent files
  ohana sim [options]      Run offline scenario simulations
  ohana check [options]    lint + sim (default CI entry)
  ohana --version          Print the ohana version

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

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "help") {
    console.log(HELP);
    process.exit(0);
  }

  if (command === "version") {
    console.log(getVersion());
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
