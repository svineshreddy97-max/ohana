#!/usr/bin/env node
import path from "node:path";
import { checkCommand } from "../commands/check.js";
import { lintCommand } from "../commands/lint.js";
import { simCommand } from "../commands/sim.js";
import { initCommand } from "../commands/init.js";
import { rulesCommand } from "../commands/rules.js";
import { coverageCommand } from "../commands/coverage.js";
import { validateCommand } from "../commands/validate.js";
import { getVersion, parseArgs, sharedOptions } from "../args.js";
import { shouldColorize } from "@ohana/core";
import { watchDir } from "../watch.js";

const HELP = `ohana — CI tooling for Salesforce Agent Script / Agentforce DX

Usage:
  ohana init [options]     Scaffold .ohana/config.yaml + scenarios/ + fixtures/
  ohana lint [options]     Parse, lint, and compile .agent files
  ohana sim [options]      Run offline scenario simulations
  ohana check [options]    lint + sim (default CI entry)
  ohana rules [options]    List available lint rules
  ohana coverage [options] Show action coverage from scenarios
  ohana validate [options] Validate .ohana/config.yaml
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
  --watch                  Re-run on file changes (.agent, .json, .yaml)
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
  ohana check --watch --path examples/testdrive-ci
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

  if (command === "coverage") {
    const covColor =
      shared.format === "text" &&
      shouldColorize({
        isTty: process.stdout.isTTY,
        noColorEnv: process.env.NO_COLOR,
        explicitNoColor: options["no-color"] === true,
      });
    process.exit(
      await coverageCommand({
        path: shared.path,
        format: shared.format === "json" ? "json" : "text",
        agentScriptEntry: shared.agentScriptEntry,
        color: covColor,
      }),
    );
  }

  if (command === "validate") {
    const valColor =
      shared.format === "text" &&
      shouldColorize({
        isTty: process.stdout.isTTY,
        noColorEnv: process.env.NO_COLOR,
        explicitNoColor: options["no-color"] === true,
      });
    process.exit(
      await validateCommand({
        path: shared.path,
        format: shared.format === "json" ? "json" : "text",
        color: valColor,
      }),
    );
  }

  const out = typeof options.out === "string" ? options.out : undefined;
  const color =
    shared.format === "text" &&
    !out &&
    shouldColorize({
      isTty: process.stdout.isTTY,
      noColorEnv: process.env.NO_COLOR,
      explicitNoColor: options["no-color"] === true,
    });

  const disableRules = options["no-rules"] === true;
  const watch = options.watch === true;
  const watchable = ["lint", "sim", "check"];

  async function run(): Promise<number> {
    if (command === "lint") {
      return lintCommand({ ...shared, out, color, quiet: shared.quiet, disableRules });
    }
    if (command === "sim") {
      return simCommand({
        ...shared,
        out,
        color,
        quiet: shared.quiet,
        filter: typeof options.filter === "string" ? options.filter : undefined,
      });
    }
    if (command === "check") {
      return checkCommand({
        ...shared,
        color,
        quiet: shared.quiet,
        skipSim: options["skip-sim"] === true,
        disableRules,
      });
    }
    return -1;
  }

  if (!watchable.includes(command!)) {
    console.error(`Unknown command: ${command}\n`);
    console.error(HELP);
    process.exit(1);
  }

  const code = await run();

  if (!watch) {
    process.exit(code);
  }

  const watchPath = path.resolve(shared.path ?? process.cwd());
  console.log(`\nWatching ${watchPath} for changes... (Ctrl+C to stop)\n`);

  let running = false;
  watchDir({
    dir: watchPath,
    onChange: async () => {
      if (running) return;
      running = true;
      try {
        console.log("\x1Bc");
        await run();
        console.log(`\nWatching ${watchPath} for changes... (Ctrl+C to stop)\n`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
      } finally {
        running = false;
      }
    },
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
