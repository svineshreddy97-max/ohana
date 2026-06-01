import { describe, expect, it } from "vitest";
import type { LintProjectResult } from "./index.js";
import { formatLintReportJUnit } from "./junit.js";

function makeResult(overrides: Partial<LintProjectResult> = {}): LintProjectResult {
  return {
    root: "/proj",
    fileCount: 1,
    errorCount: 0,
    warningCount: 0,
    ok: true,
    files: [
      {
        file: "/proj/agents/A.agent",
        errorCount: 0,
        warningCount: 0,
        ok: true,
        diagnostics: [],
        compiled: true,
      },
    ],
    ...overrides,
  };
}

describe("formatLintReportJUnit", () => {
  it("emits one passing testcase per file", () => {
    const xml = formatLintReportJUnit(makeResult());
    expect(xml).toContain('<testcase name="agents/A.agent" classname="ohana.lint"/>');
    expect(xml).toContain('<testsuite name="ohana lint" tests="1" failures="0"');
  });

  it("fails a file with compile errors and lists diagnostics in the failure body", () => {
    const xml = formatLintReportJUnit(
      makeResult({
        errorCount: 1,
        ok: false,
        files: [
          {
            file: "/proj/agents/B.agent",
            errorCount: 1,
            warningCount: 0,
            ok: false,
            compiled: false,
            diagnostics: [
              {
                file: "/proj/agents/B.agent",
                severity: "error",
                message: "Unexpected token",
                code: "ohana/compile",
                line: 2,
                column: 1,
              },
            ],
          },
        ],
      }),
    );

    expect(xml).toContain('<testcase name="agents/B.agent"');
    expect(xml).toContain('type="lint"');
    expect(xml).toContain("error 2:1 [ohana/compile] Unexpected token");
  });

  it("passes warning-only files but records warnings in system-out", () => {
    const xml = formatLintReportJUnit(
      makeResult({
        warningCount: 1,
        files: [
          {
            file: "/proj/agents/C.agent",
            errorCount: 0,
            warningCount: 1,
            ok: true,
            compiled: true,
            diagnostics: [
              {
                file: "/proj/agents/C.agent",
                severity: "warning",
                message: "Subagent has no description.",
                code: "ohana/no-missing-description",
                line: 1,
                column: 1,
              },
            ],
          },
        ],
      }),
    );

    expect(xml).toContain('<testsuite name="ohana lint" tests="1" failures="0"');
    expect(xml).toContain("[ohana/no-missing-description]");
    expect(xml).not.toContain("<failure");
  });
});
