import { describe, expect, it } from "vitest";
import type { SimProjectResult } from "./index.js";
import { formatSimReportJUnit } from "./junit.js";

function makeResult(overrides: Partial<SimProjectResult> = {}): SimProjectResult {
  return {
    root: "/proj",
    ok: true,
    scenarios: [
      {
        id: "weather-apex",
        ok: true,
        utterance: "What's the weather?",
        subagent: "local_weather",
        action: "check_weather",
        target: "CheckWeather",
        inputs: {},
        outputs: { temp: 21 },
        errors: [],
        trace: [],
      },
    ],
    ...overrides,
  };
}

describe("formatSimReportJUnit", () => {
  it("emits one passing testcase per scenario with route context in system-out", () => {
    const xml = formatSimReportJUnit(makeResult());
    expect(xml).toContain('<testcase name="weather-apex" classname="ohana.sim"');
    expect(xml).toContain("route: local_weather -&gt; check_weather (CheckWeather)");
    expect(xml).toContain('"temp":21');
    expect(xml).not.toContain("<failure");
  });

  it("fails a scenario and lists errors in the failure body", () => {
    const xml = formatSimReportJUnit(
      makeResult({
        ok: false,
        scenarios: [
          {
            id: "broken",
            ok: false,
            utterance: "hi",
            subagent: "a",
            action: "b",
            inputs: {},
            errors: ["action not found", "fixture missing"],
            trace: [],
          },
        ],
      }),
    );

    expect(xml).toContain('<testcase name="broken"');
    expect(xml).toContain('message="action not found"');
    expect(xml).toContain("fixture missing");
  });
});
