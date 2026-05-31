import path from "node:path";
import type { DiagnosticSeverityName } from "@ohana/core";
import type { LintProjectResult } from "./index.js";

/**
 * Render lint diagnostics as GitHub Actions workflow commands:
 *
 *   ::error file=agents/Foo.agent,line=12,col=5,title=ohana.compile::Unexpected token
 *
 * When `ohana lint --format github` runs inside a GitHub Actions job, these
 * lines make diagnostics appear as inline annotations on the PR — no SARIF
 * upload step required. File paths are relative to the linted root, which
 * matches the checkout layout in a typical workflow.
 *
 * https://docs.github.com/actions/reference/workflow-commands-for-github-actions
 */

function toCommand(severity: DiagnosticSeverityName): "error" | "warning" | "notice" {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "notice";
}

/** Escape message data per the workflow-command spec. */
function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** Escape a command property value (stricter than message data). */
function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function toRelative(root: string, file: string): string {
  const rel = path.relative(root, file);
  const normalized = rel.startsWith("..") ? path.basename(file) : rel;
  return normalized.split(path.sep).join("/");
}

export function formatLintReportGithub(result: LintProjectResult): string {
  const lines: string[] = [];
  for (const file of result.files) {
    for (const d of file.diagnostics) {
      const props = [
        `file=${escapeProperty(toRelative(result.root, file.file))}`,
        `line=${d.line}`,
        `col=${d.column}`,
      ];
      if (d.code) {
        props.push(`title=${escapeProperty(d.code)}`);
      }
      lines.push(`::${toCommand(d.severity)} ${props.join(",")}::${escapeData(d.message)}`);
    }
  }
  return lines.join("\n");
}
