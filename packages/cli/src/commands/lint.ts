import {
  formatLintReportSarif,
  formatLintReportText,
  lintProject,
  type LintProjectResult,
} from "@ohana/lint";

export interface LintCommandOptions {
  path?: string;
  format?: "text" | "json" | "sarif";
  failOnWarning?: boolean;
  agentScriptEntry?: string;
}

export async function lintCommand(options: LintCommandOptions = {}): Promise<number> {
  const result = await lintProject({
    root: options.path,
    failOnWarning: options.failOnWarning,
    agentScriptEntry: options.agentScriptEntry,
  });

  if (options.format === "sarif") {
    console.log(formatLintReportSarif(result));
  } else if (options.format === "json") {
    console.log(JSON.stringify(sanitizeForJson(result), null, 2));
  } else {
    console.log(formatLintReportText(result));
  }

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
