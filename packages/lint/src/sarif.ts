import path from "node:path";
import type { DiagnosticSeverityName } from "@ohana/core";
import type { LintProjectResult } from "./index.js";
import { OHANA_RULES } from "./rules.js";

const RULE_DESCRIPTIONS = new Map(OHANA_RULES.map((r) => [r.id, r.description]));

/**
 * Render a lint result as a SARIF 2.1.0 log. SARIF is the format GitHub code
 * scanning consumes, so `ohana lint --format sarif > ohana.sarif` followed by
 * `github/codeql-action/upload-sarif` surfaces diagnostics as PR annotations.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

const TOOL_NAME = "ohana";
const TOOL_VERSION = "0.4.0";
const INFORMATION_URI = "https://github.com/svineshreddy97-max/ohana";
const DEFAULT_RULE_ID = "ohana/compile";

// SARIF "level" is one of none | note | warning | error.
type SarifLevel = "note" | "warning" | "error";

function toSarifLevel(severity: DiagnosticSeverityName): SarifLevel {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    default:
      return "note";
  }
}

/** SARIF artifact URIs are relative, forward-slashed paths from the run root. */
function toUri(root: string, file: string): string {
  const rel = path.relative(root, file);
  // If the file is outside the root, fall back to its basename rather than a
  // brittle "../" chain that code scanning can't resolve.
  const normalized = rel.startsWith("..") ? path.basename(file) : rel;
  return normalized.split(path.sep).join("/");
}

export function buildSarif(result: LintProjectResult): unknown {
  // Build the rule catalog first so each result can carry a matching ruleIndex.
  const ruleIds = new Set<string>();
  for (const file of result.files) {
    for (const d of file.diagnostics) {
      ruleIds.add(d.code ?? DEFAULT_RULE_ID);
    }
  }

  const sortedIds = [...ruleIds].sort();
  const ruleIndex = new Map(sortedIds.map((id, i) => [id, i]));

  const rules = sortedIds.map((id) => ({
    id,
    name: id,
    shortDescription: {
      text:
        RULE_DESCRIPTIONS.get(id) ??
        (id === DEFAULT_RULE_ID
          ? "Agent Script compile diagnostic"
          : `Ohana lint rule ${id}`),
    },
    helpUri: INFORMATION_URI,
  }));

  const sarifResults = result.files.flatMap((file) =>
    file.diagnostics.map((d) => {
      const ruleId = d.code ?? DEFAULT_RULE_ID;
      return {
        ruleId,
        // SARIF: when both are present they must identify the same rule.
        ruleIndex: ruleIndex.get(ruleId)!,
        level: toSarifLevel(d.severity),
        message: { text: d.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: toUri(result.root, file.file) },
              region: { startLine: d.line, startColumn: d.column },
            },
          },
        ],
      };
    }),
  );

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: INFORMATION_URI,
            version: TOOL_VERSION,
            rules,
          },
        },
        results: sarifResults,
      },
    ],
  };
}

export function formatLintReportSarif(result: LintProjectResult): string {
  return JSON.stringify(buildSarif(result), null, 2);
}
