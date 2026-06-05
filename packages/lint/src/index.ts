import fs from "node:fs/promises";
import path from "node:path";
import {
  compileAgentFile,
  loadConfig,
  makeColorizer,
  resolveFromRoot,
  type AgentDiagnostic,
  type DiagnosticSeverityName,
} from "@ohana/core";
import { runOhanaRules, type RuleSeverityConfig } from "./rules.js";

export const DEFAULT_AGENT_GLOBS = [
  "**/*.agent",
  "**/aiAuthoringBundles/**/*.agent",
];

export interface LintDiagnostic extends AgentDiagnostic {
  file: string;
}

export interface LintFileResult {
  file: string;
  ok: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: LintDiagnostic[];
  compiled: boolean;
}

export interface LintProjectResult {
  root: string;
  files: LintFileResult[];
  ok: boolean;
  errorCount: number;
  warningCount: number;
  fileCount: number;
}

export interface LintProjectOptions {
  root?: string;
  globs?: string[];
  failOnWarning?: boolean;
  agentScriptEntry?: string;
  /** Per-rule severity overrides for the Ohana semantic rules. */
  rules?: RuleSeverityConfig;
  /** Disable the Ohana semantic rules, leaving only compiler diagnostics. */
  disableRules?: boolean;
}

export interface LintFileOptions {
  agentScriptEntry?: string;
  rules?: RuleSeverityConfig;
  disableRules?: boolean;
}

function globToRegExp(globPattern: string): RegExp {
  const normalized = globPattern.replace(/\\/g, "/");
  const escaped = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<DOUBLESTAR>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<DOUBLESTAR>>>/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

async function walkFiles(dir: string, ignore: Set<string>): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (ignore.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full, ignore)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

export const DEFAULT_IGNORE_DIRS = ["node_modules", ".git", "dist", ".ohana"];

export async function discoverAgentFiles(
  root: string,
  globs: string[] = DEFAULT_AGENT_GLOBS,
  extraIgnore: string[] = [],
): Promise<string[]> {
  const ignore = new Set([...DEFAULT_IGNORE_DIRS, ...extraIgnore]);
  const allFiles = await walkFiles(root, ignore);
  const patterns = globs.map((g) => globToRegExp(g));

  return allFiles
    .filter((file) => {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      return patterns.some((pattern) => pattern.test(rel));
    })
    .map((f) => path.resolve(f))
    .sort();
}

/**
 * Stable ordering (line, then column) so text and SARIF output are
 * deterministic regardless of the order the compiler emits diagnostics.
 * Returns a new array; the input is not mutated.
 */
export function sortDiagnostics(diagnostics: LintDiagnostic[]): LintDiagnostic[] {
  return [...diagnostics].sort((a, b) => a.line - b.line || a.column - b.column);
}

export async function lintFile(
  filePath: string,
  options: LintFileOptions = {},
): Promise<LintFileResult> {
  const compiled = await compileAgentFile(filePath, {
    agentScriptEntry: options.agentScriptEntry,
  });

  const raw: AgentDiagnostic[] = [...compiled.diagnostics];
  // Semantic rules need a valid IR; only run them when the compiler succeeded.
  if (!options.disableRules && compiled.output != null && !compiled.hasErrors) {
    raw.push(...runOhanaRules(compiled.output, compiled.source, options.rules));
  }

  const diagnostics: LintDiagnostic[] = sortDiagnostics(
    raw.map((d) => ({ ...d, file: filePath })),
  );

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    file: filePath,
    ok: errorCount === 0,
    errorCount,
    warningCount,
    diagnostics,
    compiled: compiled.output != null && !compiled.hasErrors,
  };
}

export async function lintProject(options: LintProjectOptions = {}): Promise<LintProjectResult> {
  const base = path.resolve(options.root ?? process.cwd());
  const { config } = loadConfig(base);
  const root = path.resolve(base, config.lint?.path ?? ".");
  const globsRaw = options.globs ?? config.lint?.globs ?? DEFAULT_AGENT_GLOBS;
  const globs = Array.isArray(globsRaw) ? globsRaw : DEFAULT_AGENT_GLOBS;
  const failOnWarning = options.failOnWarning ?? config.lint?.fail_on_warning ?? false;
  const extraIgnore = Array.isArray(config.lint?.ignore) ? config.lint!.ignore : [];
  const rules = options.rules ?? config.lint?.rules;

  const files = await discoverAgentFiles(root, globs, extraIgnore);
  const results: LintFileResult[] = [];

  for (const file of files) {
    results.push(
      await lintFile(file, {
        agentScriptEntry: options.agentScriptEntry,
        rules,
        disableRules: options.disableRules,
      }),
    );
  }

  const errorCount = results.reduce((n, r) => n + r.errorCount, 0);
  const warningCount = results.reduce((n, r) => n + r.warningCount, 0);
  const ok =
    errorCount === 0 &&
    (!failOnWarning || warningCount === 0) &&
    results.every((r) => r.ok);

  return {
    root,
    files: results,
    ok,
    errorCount,
    warningCount,
    fileCount: results.length,
  };
}

export function formatLintReportText(
  result: LintProjectResult,
  options: { color?: boolean; quiet?: boolean; elapsedMs?: number } = {},
): string {
  const c = makeColorizer(options.color ?? false);
  const lines: string[] = [];
  const timing = options.elapsedMs !== undefined ? ` ${c.dim(`in ${formatElapsed(options.elapsedMs)}`)}` : "";
  lines.push(`Ohana lint — ${result.fileCount} file(s) under ${result.root}`);
  const summary = `(${result.errorCount} errors, ${result.warningCount} warnings)`;
  lines.push((result.ok ? c.green(`OK ${summary}`) : c.red(`FAILED ${summary}`)) + timing);

  for (const file of result.files) {
    if (file.diagnostics.length === 0) {
      if (!options.quiet) {
        lines.push(`  ${c.green("✓")} ${file.file}`);
      }
      continue;
    }
    lines.push(`  ${c.red("✗")} ${file.file}`);
    for (const d of file.diagnostics) {
      const sev = d.severity === "error" ? c.red(d.severity) : d.severity === "warning" ? c.yellow(d.severity) : c.dim(d.severity);
      lines.push(
        `    ${sev} ${d.line}:${d.column} ${d.code ? `[${d.code}] ` : ""}${d.message}`,
      );
    }
  }

  return lines.join("\n");
}

function formatElapsed(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export { formatLintReportSarif, buildSarif } from "./sarif.js";
export { formatLintReportGithub } from "./github.js";
export { formatLintReportJUnit } from "./junit.js";
export {
  OHANA_RULES,
  resolveRuleSeverity,
  runOhanaRules,
  type RuleMeta,
  type RuleSeverity,
  type RuleSeverityConfig,
} from "./rules.js";
export { resolveFromRoot, loadConfig, type DiagnosticSeverityName };
