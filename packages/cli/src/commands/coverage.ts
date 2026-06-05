import path from "node:path";
import { loadConfig, resolveFromRoot } from "@ohana/core";
import { discoverAgentFiles } from "@ohana/lint";
import {
  computeCoverage,
  discoverScenarioFiles,
  formatCoverageText,
  loadScenarioFile,
} from "@ohana/sim";

export interface CoverageCommandOptions {
  path?: string;
  format?: "text" | "json";
  agentScriptEntry?: string;
  color?: boolean;
}

export async function coverageCommand(options: CoverageCommandOptions = {}): Promise<number> {
  const cwd = options.path ?? process.cwd();
  const { config } = loadConfig(cwd);
  const projectRoot = path.resolve(cwd);
  const lintRoot = path.resolve(projectRoot, config.lint?.path ?? ".");
  const scenariosDir = resolveFromRoot(projectRoot, config.sim?.scenarios ?? "scenarios");

  const agentFiles = await discoverAgentFiles(lintRoot);
  const scenarioFiles = discoverScenarioFiles(scenariosDir);
  const scenarios = scenarioFiles.map((f) => loadScenarioFile(f, projectRoot));

  const result = await computeCoverage({
    agentFiles,
    scenarios,
    agentScriptEntry: options.agentScriptEntry,
  });

  if (options.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatCoverageText(result, { color: options.color }));
  }

  return 0;
}
