import { describe, expect, it } from "vitest";
import { formatLintReportGithub } from "./github.js";
import type { LintProjectResult } from "./index.js";

const root = "/repo";

function result(): LintProjectResult {
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
            message: "Unexpected token, found %x",
            line: 12,
            column: 5,
            file: "/repo/agents/Local_Info_Agent.agent",
          },
          {
            severity: "warning",
            code: "ohana.placeholder",
            message: "Placeholder not replaced",
            line: 4,
            column: 9,
            file: "/repo/agents/Local_Info_Agent.agent",
          },
        ],
      },
    ],
  };
}

describe("formatLintReportGithub", () => {
  it("emits one workflow command per diagnostic with a relative path", () => {
    const lines = formatLintReportGithub(result()).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "::error file=agents/Local_Info_Agent.agent,line=12,col=5::Unexpected token, found %25x",
    );
    expect(lines[1]).toBe(
      "::warning file=agents/Local_Info_Agent.agent,line=4,col=9,title=ohana.placeholder::Placeholder not replaced",
    );
  });

  it("returns an empty string for a clean project", () => {
    const clean = result();
    clean.files[0]!.diagnostics = [];
    expect(formatLintReportGithub(clean)).toBe("");
  });
});
