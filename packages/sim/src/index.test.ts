import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parseScenarioText, runScenarioProject } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exampleRoot = path.resolve(__dirname, "../../../examples/testdrive-ci");
// Toolchain resolved via resolveAgentScriptEntry (sibling checkout or the repo-local
// .agentscript cache from `pnpm ensure:agentscript`) — no hard-coded sibling path.

describe("runScenarioProject", () => {
  it("runs the weather scenario against the vendored testdrive agent", async () => {
    const result = await runScenarioProject({
      scenariosDir: path.join(exampleRoot, "scenarios"),
    });

    expect(result.scenarios.length).toBe(1);
    expect(result.ok).toBe(true);
    expect(result.scenarios[0]?.action).toBe("check_weather");
    expect(result.scenarios[0]?.outputs?.maxTemperature).toBe(21);
  });
});

describe("parseScenarioText", () => {
  it("parses a JSON scenario", () => {
    const scenario = parseScenarioText(
      '{"id":"s","agent":"a.agent","utterance":"hi","subagent":"sa","action":{"name":"act"}}',
      "scenarios/s.json",
    );
    expect(scenario.id).toBe("s");
    expect(scenario.action.name).toBe("act");
  });

  it("parses a YAML scenario with a nested action map", () => {
    const yaml = `id: weather
agent: agents/Local_Info_Agent.agent
utterance: "What's the weather?"
subagent: local_weather
action:
  name: check_weather
  target: CheckWeather
  inputs:
    dateToCheck: "2026-05-30"
fixture: fixtures/CheckWeather.json
`;
    const scenario = parseScenarioText(yaml, "scenarios/weather.yaml");
    expect(scenario.id).toBe("weather");
    expect(scenario.subagent).toBe("local_weather");
    expect(scenario.action.name).toBe("check_weather");
    expect(scenario.action.target).toBe("CheckWeather");
    expect(scenario.action.inputs?.dateToCheck).toBe("2026-05-30");
    expect(scenario.fixture).toBe("fixtures/CheckWeather.json");
  });
});

describe("loadScenarioFile (YAML on disk)", () => {
  const tmpFiles: string[] = [];
  afterEach(() => {
    for (const f of tmpFiles.splice(0)) fs.rmSync(f, { force: true });
  });

  it("reads and resolves a .yaml scenario from disk", async () => {
    const { loadScenarioFile } = await import("./index.js");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ohana-sim-"));
    const file = path.join(dir, "scenario.yaml");
    tmpFiles.push(file);
    fs.writeFileSync(
      file,
      `id: y
agent: agents/x.agent
utterance: hi
subagent: sa
action:
  name: act
`,
    );
    const scenario = loadScenarioFile(file, dir);
    expect(scenario.id).toBe("y");
    // agent path is resolved against the project root.
    expect(path.isAbsolute(scenario.agent)).toBe(true);
    expect(scenario.agent.endsWith("agents" + path.sep + "x.agent")).toBe(true);
  });
});
