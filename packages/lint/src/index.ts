import fs from "node:fs/promises";
import path from "node:path";
import {
  compileAgentFile,
  loadConfig,
  resolveFromRoot,
  type AgentDiagnostic,
  type DiagnosticSeverityName,
} from "@ohana/core";

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

export async function discoverAgentFiles(
  root: string,
  globs: string[] = DEFAULT_AGENT_GLOBS,
): Promise<string[]> {
  const ignore = new Set(["node_modules", ".git", "dist", ".ohana"]);
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

export async function lintFile(
  filePath: string,
  options: { agentScriptEntry?: string } = {},
): Promise<LintFileResult> {
  const compiled = await compileAgentFile(filePath, options);
  const diagnostics: LintDiagnostic[] = compiled.diagnostics.map((d) => ({
    ...d,
    file: filePath,
  }));

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

  const files = await discoverAgentFiles(root, globs);
  const results: LintFileResult[] = [];

  for (const file of files) {
    results.push(await lintFile(file, { agentScriptEntry: options.agentScriptEntry }));
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

export function formatLintReportText(result: LintProjectResult): string {
  const lines: string[] = [];
  lines.push(`Ohana lint — ${result.fileCount} file(s) under ${result.root}`);
  lines.push(
    result.ok
      ? `OK (${result.errorCount} errors, ${result.warningCount} warnings)`
      : `FAILED (${result.errorCount} errors, ${result.warningCount} warnings)`,
  );

  for (const file of result.files) {
    if (file.diagnostics.length === 0) {
      lines.push(`  ✓ ${file.file}`);
      continue;
    }
    lines.push(`  ✗ ${file.file}`);
    for (const d of file.diagnostics) {
      lines.push(
        `    ${d.severity} ${d.line}:${d.column} ${d.code ? `[${d.code}] ` : ""}${d.message}`,
      );
    }
  }

  return lines.join("\n");
}

export { resolveFromRoot, loadConfig, type DiagnosticSeverityName };
