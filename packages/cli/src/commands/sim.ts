import path from "node:path";
import { loadConfig, resolveFromRoot } from "@ohana/core";
import { formatSimReportText, runScenarioProject } from "@ohana/sim";
import { emitReport } from "./output.js";

export interface SimCommandOptions {
  path?: string;
  // "sarif" and "github" are lint-only formats; sim renders them as text.
  format?: "text" | "json" | "sarif" | "github";
  agentScriptEntry?: string;
  /** Case-insensitive substring; only scenarios whose id contains it run. */
  filter?: string;
  out?: string;
  color?: boolean;
}

export async function simCommand(options: SimCommandOptions = {}): Promise<number> {
  const cwd = options.path ?? process.cwd();
  const { config } = loadConfig(cwd);
  const projectRoot = path.resolve(cwd);
  const scenariosDir = resolveFromRoot(projectRoot, config.sim?.scenarios ?? "scenarios");

  const result = await runScenarioProject({
    scenariosDir,
    projectRoot,
    agentScriptEntry: options.agentScriptEntry,
    filter: options.filter,
  });

  const output =
    options.format === "json"
      ? JSON.stringify(result, null, 2)
      : formatSimReportText(result, { color: options.color });
  emitReport(output, options.out);

  if (result.scenarios.length === 0) {
    if (options.filter) {
      console.error(`\nNo scenarios matched --filter "${options.filter}" in ${scenariosDir}`);
    } else {
      console.error(`\nNo scenarios found in ${scenariosDir}`);
      console.error("Add JSON files under scenarios/ — see examples/scenarios/");
    }
    return 2;
  }

  return result.ok ? 0 : 1;
}
