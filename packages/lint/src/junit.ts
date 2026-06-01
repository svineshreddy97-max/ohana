import path from "node:path";
import { buildJUnitXml, type JUnitTestCase } from "@ohana/core";
import type { LintFileResult, LintProjectResult } from "./index.js";

/**
 * Render a lint result as JUnit XML — one <testcase> per `.agent` file. A file
 * with compile/rule errors becomes a failing case whose <failure> body lists
 * every diagnostic; warning-only files pass but record their warnings in
 * <system-out>. Drop the file into a CI test reporter to see per-file results.
 */

function relative(root: string, file: string): string {
  const rel = path.relative(root, file);
  const normalized = rel.startsWith("..") ? path.basename(file) : rel;
  return normalized.split(path.sep).join("/");
}

function formatDiagnostics(file: LintFileResult): string {
  return file.diagnostics
    .map((d) => `${d.severity} ${d.line}:${d.column} ${d.code ? `[${d.code}] ` : ""}${d.message}`)
    .join("\n");
}

function toCase(root: string, file: LintFileResult): JUnitTestCase {
  const name = relative(root, file.file);
  const base: JUnitTestCase = { name, classname: "ohana.lint" };

  if (file.errorCount > 0) {
    return {
      ...base,
      failures: [
        {
          message: `${file.errorCount} error(s), ${file.warningCount} warning(s)`,
          type: "lint",
          details: formatDiagnostics(file),
        },
      ],
    };
  }

  if (file.warningCount > 0) {
    return { ...base, systemOut: formatDiagnostics(file) };
  }

  return base;
}

export function formatLintReportJUnit(result: LintProjectResult): string {
  return buildJUnitXml(
    [
      {
        name: "ohana lint",
        cases: result.files.map((f) => toCase(result.root, f)),
      },
    ],
    { name: "ohana" },
  );
}
