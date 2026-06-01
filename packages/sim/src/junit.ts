import { buildJUnitXml, type JUnitTestCase } from "@ohana/core";
import type { SimProjectResult, SimScenarioResult } from "./index.js";

/**
 * Render a sim result as JUnit XML — one <testcase> per scenario. A failing
 * scenario's <failure> body lists its errors; the route and outputs are
 * recorded in <system-out> for context in a CI test reporter.
 */

function systemOut(scenario: SimScenarioResult): string {
  const lines = [
    `utterance: ${scenario.utterance}`,
    `route: ${scenario.subagent} -> ${scenario.action}${scenario.target ? ` (${scenario.target})` : ""}`,
  ];
  if (scenario.outputs) {
    lines.push(`outputs: ${JSON.stringify(scenario.outputs)}`);
  }
  return lines.join("\n");
}

function toCase(scenario: SimScenarioResult): JUnitTestCase {
  const base: JUnitTestCase = {
    name: scenario.id,
    classname: "ohana.sim",
    systemOut: systemOut(scenario),
  };

  if (!scenario.ok) {
    return {
      ...base,
      failures: [
        {
          message: scenario.errors[0] ?? "scenario failed",
          type: "sim",
          details: scenario.errors.join("\n"),
        },
      ],
    };
  }

  return base;
}

export function formatSimReportJUnit(result: SimProjectResult): string {
  return buildJUnitXml(
    [
      {
        name: "ohana sim",
        cases: result.scenarios.map(toCase),
      },
    ],
    { name: "ohana" },
  );
}
