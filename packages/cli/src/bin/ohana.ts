#!/usr/bin/env node
import { checkCommand } from "../commands/check.js";
import { lintCommand } from "../commands/lint.js";
import { simCommand } from "../commands/sim.js";
import { initCommand } from "../commands/init.js";
import { rulesCommand } from "../commands/rules.js";
import { getVersion, parseArgs, sharedOptions } from "../args.js";
import { shouldColorize } from "@ohana/core";

const HELP = `ohana — CI tooling for Salesforce Agent Script / Agentforce DX

Usage:
  ohana init [options]     Scaffold .ohana/config.yaml + scenarios/ + fixtures/
  ohana lint [options]     Parse, lint, and compile .agent files
  ohana sim [options]      Run offline scenario simulations
  ohana check [options]    lint + sim (default CI entry)
  ohana rules [options]    List available lint rules
  ohana --version          Print the ohana version

Options (lint / check):
  --path <dir>             Project root (default: cwd or .ohana/config.yaml)
  --format <text|json|sarif|github|junit>  Output format (default: text).
                           sarif: GitHub code scanning upload (lint).
                           github: inline PR annotations via workflow commands (lint).
                           junit: JUnit XML for CI test reporters (lint/sim).
  --fail-on-warning        Exit non-zero on warnings
  --no-rules               Disable Ohana semantic lint rules (compiler only)
  --out <file>             Write the report to a file instead of stdout (lint/sim)
  --quiet                  Only show failures in text output
  --no-color               Disable ANSI color (also honors NO_COLOR)
  --agentscript <path>     Path to @agentscript/agentforce dist/index.js
  --skip-sim               For check: run lint only

Options (sim):
  --path <dir>             Project root containing scenarios/ (default: cwd)
  --filter <id>            Only run scenarios whose id contains this substring

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

  if (command === "init") {
    process.exit(await initCommand({ path: shared.path }));
  }

  if (command === "rules") {
    const rulesColor =
      shared.format === "text" &&
      shouldColorize({
        isTty: process.stdout.isTTY,
        noColorEnv: process.env.NO_COLOR,
        explicitNoColor: options["no-color"] === true,
      });
    process.exit(
      await rulesCommand({
        path: shared.path,
        format: shared.format === "json" ? "json" : "text",
        color: rulesColor,
      }),
    );
  }

  const out = typeof options.out === "string" ? options.out : undefined;
  // Color only makes sense for text written to a TTY (not files or machine formats).
  const color =
    shared.format === "text" &&
    !out &&
    shouldColorize({
      isTty: process.stdout.isTTY,
      noColorEnv: process.env.NO_COLOR,
      explicitNoColor: options["no-color"] === true,
    });

  const disableRules = options["no-rules"] === true;

  if (command === "lint") {
    process.exit(await lintCommand({ ...shared, out, color, quiet: shared.quiet, disableRules }));
  }

  if (command === "sim") {
    process.exit(
      await simCommand({
        ...shared,
        out,
        color,
        quiet: shared.quiet,
        filter: typeof options.filter === "string" ? options.filter : undefined,
      }),
    );
  }

  if (command === "check") {
    process.exit(
      await checkCommand({
        ...shared,
        color,
        quiet: shared.quiet,
        skipSim: options["skip-sim"] === true,
        disableRules,
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
