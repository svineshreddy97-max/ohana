import fs from "node:fs";
import path from "node:path";
import {
  compileAgentFile,
  findAction,
  findNode,
  parseSimpleYaml,
} from "@ohana/core";

export interface ActionFixtureFile {
  action?: string;
  target?: string;
  mocks: ActionFixtureMock[];
}

export interface ActionFixtureMock {
  match: Record<string, unknown> & { default?: boolean };
  outputs: Record<string, unknown>;
}

export function loadFixtureFile(fixturePath: string): ActionFixtureFile {
  const text = fs.readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(text) as ActionFixtureFile;
  if (!Array.isArray(parsed.mocks) || parsed.mocks.length === 0) {
    throw new Error(`Fixture ${fixturePath} must define at least one mock entry`);
  }
  return parsed;
}

export function resolveFixtureOutputs(
  fixture: ActionFixtureFile,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  for (const mock of fixture.mocks) {
    if (mock.match.default) {
      continue;
    }
    if (matchesInputs(mock.match, inputs)) {
      return mock.outputs;
    }
  }

  const fallback = fixture.mocks.find((m) => m.match.default);
  if (fallback) {
    return fallback.outputs;
  }

  throw new Error(`No fixture mock matched inputs: ${JSON.stringify(inputs)}`);
}

function matchesInputs(match: Record<string, unknown>, inputs: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(match)) {
    if (key === "default") continue;
    if (!deepEqual(inputs[key], expected)) {
      return false;
    }
  }
  return true;
}

/** Structural equality for JSON-shaped values (scalars, arrays, plain objects). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const aKeys = Object.keys(ao);
    const bKeys = Object.keys(bo);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]));
  }

  return false;
}

export interface SimScenario {
  id: string;
  agent: string;
  utterance: string;
  subagent: string;
  action: {
    name: string;
    target?: string;
    inputs?: Record<string, unknown>;
  };
  fixture?: string;
  expect?: {
    outputs?: Record<string, unknown>;
  };
}

/** Parse a scenario file by extension: JSON for .json, the config YAML subset for .yaml/.yml. */
export function parseScenarioText(text: string, scenarioPath: string): SimScenario {
  if (/\.ya?ml$/i.test(scenarioPath)) {
    return parseSimpleYaml(text) as unknown as SimScenario;
  }
  return JSON.parse(text) as SimScenario;
}

export function loadScenarioFile(scenarioPath: string, projectRoot?: string): SimScenario {
  const text = fs.readFileSync(scenarioPath, "utf8");
  const parsed = parseScenarioText(text, scenarioPath);
  const root = projectRoot ?? path.dirname(path.dirname(scenarioPath));

  if (!parsed.id || !parsed.agent || !parsed.utterance || !parsed.subagent || !parsed.action?.name) {
    throw new Error(
      `Invalid scenario ${scenarioPath}: requires id, agent, utterance, subagent, action.name`,
    );
  }

  parsed.agent = path.resolve(root, parsed.agent);
  if (parsed.fixture) {
    parsed.fixture = path.resolve(root, parsed.fixture);
  }

  return parsed;
}

export function discoverScenarioFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverScenarioFiles(full));
    } else if (/\.(json|ya?ml)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files.sort();
}

export interface SimTraceEvent {
  type: string;
  [key: string]: unknown;
}

export interface SimScenarioResult {
  id: string;
  ok: boolean;
  utterance: string;
  subagent: string;
  action: string;
  target?: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  errors: string[];
  trace: SimTraceEvent[];
}

export interface RunScenarioOptions {
  agentScriptEntry?: string;
}

export async function runScenario(
  scenario: SimScenario,
  options: RunScenarioOptions = {},
): Promise<SimScenarioResult> {
  const trace: SimTraceEvent[] = [];
  const errors: string[] = [];

  trace.push({ type: "session_start", scenario: scenario.id, agent: scenario.agent });
  trace.push({ type: "utterance", role: "user", text: scenario.utterance });

  let compiled;
  try {
    compiled = await compileAgentFile(scenario.agent, options);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return buildResult(scenario, false, errors, trace, scenario.action.inputs ?? {});
  }

  if (compiled.hasErrors) {
    errors.push(
      ...compiled.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => `${d.line}:${d.column} ${d.message}`),
    );
    return buildResult(scenario, false, errors, trace, scenario.action.inputs ?? {});
  }

  const node = findNode(compiled.output, scenario.subagent);
  if (!node) {
    errors.push(`Subagent not found in compiled IR: ${scenario.subagent}`);
    return buildResult(scenario, false, errors, trace, scenario.action.inputs ?? {});
  }

  trace.push({ type: "route", subagent: scenario.subagent });

  const action = findAction(node, scenario.action.name);
  if (!action) {
    errors.push(`Action not found on subagent ${scenario.subagent}: ${scenario.action.name}`);
    return buildResult(scenario, false, errors, trace, scenario.action.inputs ?? {});
  }

  const target = action.invocation_target_name;
  if (scenario.action.target && target !== scenario.action.target) {
    errors.push(
      `Action target mismatch: expected ${scenario.action.target}, got ${target ?? "(none)"}`,
    );
  }

  const inputs = scenario.action.inputs ?? {};
  trace.push({
    type: "action_invoke",
    action: scenario.action.name,
    target,
    inputs,
  });

  let outputs: Record<string, unknown> | undefined;
  if (scenario.fixture) {
    try {
      const fixture = loadFixtureFile(scenario.fixture);
      outputs = resolveFixtureOutputs(fixture, inputs);
      trace.push({ type: "action_result", outputs });
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (scenario.expect?.outputs && outputs) {
    for (const [key, expected] of Object.entries(scenario.expect.outputs)) {
      if (!deepEqual(outputs[key], expected)) {
        errors.push(
          `Expected output ${key}=${JSON.stringify(expected)}, got ${JSON.stringify(outputs[key])}`,
        );
      }
    }
  }

  trace.push({
    type: "assistant_message",
    text: formatAssistantSummary(scenario, outputs),
  });
  trace.push({ type: "session_end", status: errors.length === 0 ? "ok" : "failed" });

  return buildResult(scenario, errors.length === 0, errors, trace, inputs, target, outputs);
}

function buildResult(
  scenario: SimScenario,
  ok: boolean,
  errors: string[],
  trace: SimTraceEvent[],
  inputs: Record<string, unknown>,
  target?: string,
  outputs?: Record<string, unknown>,
): SimScenarioResult {
  return {
    id: scenario.id,
    ok,
    utterance: scenario.utterance,
    subagent: scenario.subagent,
    action: scenario.action.name,
    target,
    inputs,
    outputs,
    errors,
    trace,
  };
}

function formatAssistantSummary(
  scenario: SimScenario,
  outputs?: Record<string, unknown>,
): string {
  if (!outputs) {
    return `[sim] Routed to ${scenario.subagent} and invoked ${scenario.action.name}`;
  }
  return `[sim] ${scenario.action.name} → ${JSON.stringify(outputs)}`;
}

export interface SimProjectResult {
  root: string;
  scenarios: SimScenarioResult[];
  ok: boolean;
}

export async function runScenarioProject(options: {
  scenariosDir: string;
  projectRoot?: string;
  agentScriptEntry?: string;
  /** Case-insensitive substring; only scenarios whose id contains it are run. */
  filter?: string;
}): Promise<SimProjectResult> {
  const scenariosDir = path.resolve(options.scenariosDir);
  const projectRoot = options.projectRoot ?? path.dirname(scenariosDir);
  const files = discoverScenarioFiles(scenariosDir);

  const all = files.map((file) => loadScenarioFile(file, projectRoot));
  const filter = options.filter?.toLowerCase();
  const loaded = filter ? all.filter((s) => s.id.toLowerCase().includes(filter)) : all;

  // Scenario ids identify a test in reports — collisions are a config error.
  const idCounts = new Map<string, number>();
  for (const s of loaded) {
    idCounts.set(s.id, (idCounts.get(s.id) ?? 0) + 1);
  }
  const duplicateIds = new Set(
    [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );

  const scenarios: SimScenarioResult[] = [];
  for (const scenario of loaded) {
    const result = await runScenario(scenario, { agentScriptEntry: options.agentScriptEntry });
    if (duplicateIds.has(scenario.id)) {
      result.ok = false;
      result.errors.push(`Duplicate scenario id: ${scenario.id}`);
    }
    scenarios.push(result);
  }

  return {
    root: scenariosDir,
    scenarios,
    ok: scenarios.length > 0 && scenarios.every((s) => s.ok),
  };
}

export function formatSimReportText(result: SimProjectResult): string {
  const lines: string[] = [];
  lines.push(`Ohana sim — ${result.scenarios.length} scenario(s) under ${result.root}`);
  lines.push(result.ok ? "OK" : "FAILED");

  for (const scenario of result.scenarios) {
    lines.push(`  ${scenario.ok ? "✓" : "✗"} ${scenario.id}`);
    lines.push(`    utterance: ${scenario.utterance}`);
    lines.push(
      `    route: ${scenario.subagent} → ${scenario.action}${scenario.target ? ` (${scenario.target})` : ""}`,
    );
    if (scenario.outputs) {
      lines.push(`    outputs: ${JSON.stringify(scenario.outputs)}`);
    }
    for (const err of scenario.errors) {
      lines.push(`    error: ${err}`);
    }
  }

  return lines.join("\n");
}
