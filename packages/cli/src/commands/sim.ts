import path from "node:path";
import { loadConfig, resolveFromRoot } from "@ohana/core";
import { formatSimReportText, runScenarioProject } from "@ohana/sim";

export interface SimCommandOptions {
  path?: string;
  format?: "text" | "json";
  agentScriptEntry?: string;
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
  });

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatSimReportText(result));
  }

  if (result.scenarios.length === 0) {
    console.error(`\nNo scenarios found in ${scenariosDir}`);
    console.error("Add JSON files under scenarios/ — see examples/scenarios/");
    return 2;
  }

  return result.ok ? 0 : 1;
}
