import { describe, expect, it } from "vitest";
import {
  formatLintReportText,
  sortDiagnostics,
  type LintDiagnostic,
  type LintProjectResult,
} from "./index.js";

function diag(line: number, column: number, message = "x"): LintDiagnostic {
  return { severity: "error", message, line, column, file: "a.agent" };
}

describe("sortDiagnostics", () => {
  it("orders by line then column", () => {
    const sorted = sortDiagnostics([diag(12, 3), diag(4, 9), diag(4, 1), diag(12, 1)]);
    expect(sorted.map((d) => [d.line, d.column])).toEqual([
      [4, 1],
      [4, 9],
      [12, 1],
      [12, 3],
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [diag(2, 1), diag(1, 1)];
    const copy = [...input];
    sortDiagnostics(input);
    expect(input).toEqual(copy);
  });
});

describe("formatLintReportText color", () => {
  const clean: LintProjectResult = {
    root: "/repo",
    ok: true,
    errorCount: 0,
    warningCount: 0,
    fileCount: 1,
    files: [
      { file: "/repo/A.agent", ok: true, errorCount: 0, warningCount: 0, compiled: true, diagnostics: [] },
    ],
  };

  it("emits plain text by default", () => {
    const out = formatLintReportText(clean);
    expect(out).not.toContain("\x1b[");
    expect(out).toContain("OK (0 errors, 0 warnings)");
  });

  it("wraps the summary and check mark in ANSI when color is on", () => {
    const out = formatLintReportText(clean, { color: true });
    expect(out).toContain("\x1b[32m"); // green
  });
});
