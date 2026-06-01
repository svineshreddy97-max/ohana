import { describe, expect, it } from "vitest";
import { buildSarif, formatLintReportSarif } from "./sarif.js";
import type { LintProjectResult } from "./index.js";

const root = "/repo";

function makeResult(overrides: Partial<LintProjectResult> = {}): LintProjectResult {
  return {
    root,
    ok: false,
    errorCount: 1,
    warningCount: 1,
    fileCount: 1,
    files: [
      {
        file: "/repo/agents/Local_Info_Agent.agent",
        ok: false,
        errorCount: 1,
        warningCount: 1,
        compiled: false,
        diagnostics: [
          {
            severity: "error",
            message: "Unexpected token",
            line: 12,
            column: 5,
            file: "/repo/agents/Local_Info_Agent.agent",
          },
          {
            severity: "warning",
            code: "ohana/placeholder",
            message: "Placeholder value not replaced",
            line: 4,
            column: 9,
            file: "/repo/agents/Local_Info_Agent.agent",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildSarif", () => {
  it("produces a valid SARIF 2.1.0 skeleton", () => {
    const sarif = buildSarif(makeResult()) as any;
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe("ohana");
  });

  it("maps each diagnostic to a result with relative URI and 1-based region", () => {
    const sarif = buildSarif(makeResult()) as any;
    const results = sarif.runs[0].results;
    expect(results).toHaveLength(2);

    const [err, warn] = results;
    expect(err.level).toBe("error");
    expect(err.ruleId).toBe("ohana/compile"); // no code -> default rule
    expect(err.locations[0].physicalLocation.artifactLocation.uri).toBe(
      "agents/Local_Info_Agent.agent",
    );
    expect(err.locations[0].physicalLocation.region).toEqual({
      startLine: 12,
      startColumn: 5,
    });

    expect(warn.level).toBe("warning");
    expect(warn.ruleId).toBe("ohana/placeholder");
  });

  it("declares each distinct ruleId once in tool.driver.rules", () => {
    const sarif = buildSarif(makeResult()) as any;
    const ruleIds = sarif.runs[0].tool.driver.rules.map((r: any) => r.id);
    expect(ruleIds).toEqual(["ohana/compile", "ohana/placeholder"]);
  });

  it("emits a ruleIndex on each result that points at the matching rule", () => {
    const sarif = buildSarif(makeResult()) as any;
    const rules = sarif.runs[0].tool.driver.rules;
    for (const r of sarif.runs[0].results) {
      expect(typeof r.ruleIndex).toBe("number");
      expect(rules[r.ruleIndex].id).toBe(r.ruleId);
    }
  });

  it("emits an empty results array for a clean project", () => {
    const clean = makeResult({
      ok: true,
      errorCount: 0,
      warningCount: 0,
      files: [
        {
          file: "/repo/agents/Clean.agent",
          ok: true,
          errorCount: 0,
          warningCount: 0,
          compiled: true,
          diagnostics: [],
        },
      ],
    });
    const sarif = buildSarif(clean) as any;
    expect(sarif.runs[0].results).toEqual([]);
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
  });

  it("formatLintReportSarif returns parseable JSON", () => {
    const text = formatLintReportSarif(makeResult());
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
