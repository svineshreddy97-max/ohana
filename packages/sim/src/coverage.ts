import path from "node:path";
import { compileAgentFile, findNode, makeColorizer } from "@ohana/core";
import { discoverScenarioFiles, loadScenarioFile, type SimScenario } from "./index.js";

export interface ActionCoverage {
  subagent: string;
  action: string;
  target?: string;
  covered: boolean;
  scenarioIds: string[];
}

export interface CoverageResult {
  agentFile: string;
  subagents: string[];
  actions: ActionCoverage[];
  coveredCount: number;
  totalCount: number;
}

export interface CoverageProjectResult {
  results: CoverageResult[];
  totalActions: number;
  coveredActions: number;
}

export async function computeCoverage(options: {
  agentFiles: string[];
  scenarios: SimScenario[];
  agentScriptEntry?: string;
}): Promise<CoverageProjectResult> {
  const results: CoverageResult[] = [];

  for (const agentFile of options.agentFiles) {
    let compiled;
    try {
      compiled = await compileAgentFile(agentFile, {
        agentScriptEntry: options.agentScriptEntry,
      });
    } catch {
      continue;
    }
    if (!compiled.output || compiled.hasErrors) continue;

    const nodes = compiled.output.agent_version?.nodes ?? [];
    const subagents = nodes.map((n) => n.developer_name);
    const actions: ActionCoverage[] = [];

    for (const node of nodes) {
      for (const action of node.action_definitions ?? []) {
        const matching = options.scenarios.filter(
          (s) =>
            path.resolve(s.agent) === path.resolve(agentFile) &&
            s.subagent === node.developer_name &&
            s.action.name === action.developer_name,
        );
        actions.push({
          subagent: node.developer_name,
          action: action.developer_name,
          target: action.invocation_target_name,
          covered: matching.length > 0,
          scenarioIds: matching.map((s) => s.id),
        });
      }
    }

    results.push({
      agentFile,
      subagents,
      actions,
      coveredCount: actions.filter((a) => a.covered).length,
      totalCount: actions.length,
    });
  }

  return {
    results,
    totalActions: results.reduce((n, r) => n + r.totalCount, 0),
    coveredActions: results.reduce((n, r) => n + r.coveredCount, 0),
  };
}

export function formatCoverageText(
  result: CoverageProjectResult,
  options: { color?: boolean } = {},
): string {
  const c = makeColorizer(options.color ?? false);
  const lines: string[] = [];
  const pct =
    result.totalActions > 0
      ? Math.round((result.coveredActions / result.totalActions) * 100)
      : 0;
  lines.push(
    `Ohana coverage — ${result.coveredActions}/${result.totalActions} actions covered (${pct}%)`,
  );

  for (const file of result.results) {
    const filePct =
      file.totalCount > 0
        ? Math.round((file.coveredCount / file.totalCount) * 100)
        : 0;
    lines.push(
      `\n  ${c.bold(file.agentFile)} ${c.dim(`(${file.coveredCount}/${file.totalCount}, ${filePct}%)`)}`,
    );
    for (const action of file.actions) {
      const icon = action.covered ? c.green("✓") : c.red("✗");
      const label = `${action.subagent}.${action.action}`;
      const scenarios = action.covered
        ? ` ${c.dim(`[${action.scenarioIds.join(", ")}]`)}`
        : "";
      lines.push(`    ${icon} ${label}${scenarios}`);
    }
  }

  return lines.join("\n");
}
