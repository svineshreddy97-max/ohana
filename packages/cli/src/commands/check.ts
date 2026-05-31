import { lintCommand, type LintCommandOptions } from "./lint.js";
import { simCommand, type SimCommandOptions } from "./sim.js";

export interface CheckCommandOptions {
  path?: string;
  format?: "text" | "json" | "sarif" | "github";
  failOnWarning?: boolean;
  agentScriptEntry?: string;
  skipSim?: boolean;
  color?: boolean;
}

export async function checkCommand(options: CheckCommandOptions = {}): Promise<number> {
  const lintOpts: LintCommandOptions = {
    path: options.path,
    format: options.format,
    failOnWarning: options.failOnWarning,
    agentScriptEntry: options.agentScriptEntry,
    color: options.color,
  };

  const lintCode = await lintCommand(lintOpts);
  if (lintCode !== 0) {
    return lintCode;
  }

  if (options.skipSim) {
    return 0;
  }

  console.log("");
  return simCommand({
    path: options.path,
    format: options.format,
    agentScriptEntry: options.agentScriptEntry,
    color: options.color,
  });
}

export { lintCommand, simCommand };
