import {
  formatLintReportGithub,
  formatLintReportJUnit,
  formatLintReportSarif,
  formatLintReportText,
  lintProject,
  type LintProjectResult,
} from "@ohana/lint";
import { emitReport } from "./output.js";

export interface LintCommandOptions {
  path?: string;
  format?: "text" | "json" | "sarif" | "github" | "junit";
  failOnWarning?: boolean;
  agentScriptEntry?: string;
  out?: string;
  color?: boolean;
  quiet?: boolean;
  /** Disable the Ohana semantic rules, leaving only compiler diagnostics. */
  disableRules?: boolean;
}

export async function lintCommand(options: LintCommandOptions = {}): Promise<number> {
  const result = await lintProject({
    root: options.path,
    failOnWarning: options.failOnWarning,
    agentScriptEntry: options.agentScriptEntry,
    disableRules: options.disableRules,
  });

  const output =
    options.format === "sarif"
      ? formatLintReportSarif(result)
      : options.format === "github"
        ? formatLintReportGithub(result)
        : options.format === "junit"
          ? formatLintReportJUnit(result)
          : options.format === "json"
            ? JSON.stringify(sanitizeForJson(result), null, 2)
            : formatLintReportText(result, { color: options.color, quiet: options.quiet });
  emitReport(output, options.out);

  if (result.fileCount === 0) {
    // Keep stdout valid for machine formats; report the hint on stderr only.
    console.error("\nNo .agent files found. Use --path to point at your DX project root.");
    return 2;
  }

  return result.ok ? 0 : 1;
}

function sanitizeForJson(result: LintProjectResult) {
  return {
    ok: result.ok,
    root: result.root,
    fileCount: result.fileCount,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    files: result.files.map((f) => ({
      file: f.file,
      ok: f.ok,
      errorCount: f.errorCount,
      warningCount: f.warningCount,
      compiled: f.compiled,
      diagnostics: f.diagnostics,
    })),
  };
}
