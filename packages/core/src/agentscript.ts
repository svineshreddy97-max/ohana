import fs from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

export type DiagnosticSeverityName = "error" | "warning" | "information" | "hint";

export interface AgentDiagnostic {
  severity: DiagnosticSeverityName;
  message: string;
  code?: string;
  source?: string;
  line: number;
  column: number;
}

export interface CompileAgentResult {
  source: string;
  output: AgentIr;
  diagnostics: AgentDiagnostic[];
  hasErrors: boolean;
}

/** Compiled Agent Script intermediate representation (subset used by Ohana). */
export interface AgentIr {
  schema_version?: string;
  global_configuration?: Record<string, unknown>;
  agent_version?: AgentVersionIr;
}

export interface AgentVersionIr {
  planner_type?: string;
  initial_node?: string;
  nodes?: AgentNodeIr[];
  system_messages?: Record<string, string>;
  state_variables?: unknown[];
}

export interface AgentActionInputIr {
  developer_name: string;
  label?: string;
  description?: string;
  data_type?: string;
  required?: boolean;
  is_list?: boolean;
}

export interface AgentActionOutputIr {
  developer_name: string;
  label?: string;
  description?: string;
  data_type?: string;
  is_list?: boolean;
  is_displayable?: boolean;
}

export interface AgentActionIr {
  developer_name: string;
  label?: string;
  description?: string;
  invocation_target_type?: string;
  invocation_target_name?: string;
  input_type?: AgentActionInputIr[];
  output_type?: AgentActionOutputIr[];
}

/** A tool wired into a subagent's reasoning — an action invocation or a routing transition. */
export interface AgentToolIr {
  name?: string;
  target?: string;
  type?: string;
  description?: string;
  /** State writes; routing transitions encode the next topic here. */
  state_updates?: Array<Record<string, string>>;
  llm_inputs?: string[];
  bound_inputs?: Record<string, unknown>;
}

export interface AgentNodeIr {
  developer_name: string;
  label?: string;
  description?: string;
  type?: string;
  reasoning_type?: string;
  action_definitions?: AgentActionIr[];
  tools?: AgentToolIr[];
  instructions?: string;
}

export type CompileSourceFn = (source: string) => {
  diagnostics: Array<{
    severity: number;
    message: string;
    code?: string;
    source?: string;
    range: { start: { line: number; character: number } };
  }>;
  output: AgentIr;
};

const SEVERITY_NAMES: Record<number, DiagnosticSeverityName> = {
  1: "error",
  2: "warning",
  3: "information",
  4: "hint",
};

function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveAgentScriptEntry(explicit?: string): string {
  if (explicit) {
    return path.resolve(explicit);
  }
  if (process.env.OHANA_AGENTSCRIPT_ENTRY) {
    return path.resolve(process.env.OHANA_AGENTSCRIPT_ENTRY);
  }

  const candidates = [
    path.resolve(process.cwd(), "node_modules/@agentscript/agentforce/dist/index.js"),
    // Repo-local cache populated by `pnpm ensure:agentscript` (standalone ohana repo).
    path.resolve(import.meta.dirname, "../../../.agentscript/packages/agentforce/dist/index.js"),
    // Sibling checkout in the opsrc research workspace.
    path.resolve(import.meta.dirname, "../../../../sf-repos/agentscript/packages/agentforce/dist/index.js"),
    path.resolve(import.meta.dirname, "../../../../../sf-repos/agentscript/packages/agentforce/dist/index.js"),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Cannot find @agentscript/agentforce build. Run: pnpm ensure:agentscript (from ohana root) " +
      "or set OHANA_AGENTSCRIPT_ENTRY to dist/index.js",
  );
}

export async function loadCompileSource(entry?: string): Promise<CompileSourceFn> {
  const resolved = resolveAgentScriptEntry(entry);
  const mod = await import(pathToFileURL(resolved).href);
  if (typeof mod.compileSource !== "function") {
    throw new Error(`Invalid agentscript entry (missing compileSource): ${resolved}`);
  }
  return mod.compileSource as CompileSourceFn;
}

/** Suppress stray debug logs from agentscript toolchain during CI output. */
export function runCompileQuiet(compileSource: CompileSourceFn, source: string) {
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.startsWith("Schema:")) {
      return;
    }
    originalLog(...args);
  };
  try {
    return compileSource(source);
  } finally {
    console.log = originalLog;
  }
}

function mapDiagnostics(
  raw: ReturnType<CompileSourceFn>["diagnostics"],
): AgentDiagnostic[] {
  return raw.map((d) => ({
    severity: SEVERITY_NAMES[d.severity] ?? "information",
    message: d.message,
    code: d.code,
    source: d.source,
    line: d.range.start.line + 1,
    column: d.range.start.character + 1,
  }));
}

export async function compileAgentFile(
  filePath: string,
  options: { agentScriptEntry?: string } = {},
): Promise<CompileAgentResult> {
  const source = fs.readFileSync(filePath, "utf8");
  const compileSource = await loadCompileSource(options.agentScriptEntry);
  const result = runCompileQuiet(compileSource, source);
  const diagnostics = mapDiagnostics(result.diagnostics);
  const hasErrors = diagnostics.some((d) => d.severity === "error");

  return {
    source,
    output: result.output,
    diagnostics,
    hasErrors,
  };
}

export function findNode(ir: AgentIr, developerName: string): AgentNodeIr | undefined {
  return ir.agent_version?.nodes?.find((n) => n.developer_name === developerName);
}

export function findAction(node: AgentNodeIr, actionName: string): AgentActionIr | undefined {
  return node.action_definitions?.find((a) => a.developer_name === actionName);
}
