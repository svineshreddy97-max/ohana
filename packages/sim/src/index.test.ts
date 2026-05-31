import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runScenarioProject } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exampleRoot = path.resolve(__dirname, "../../../examples/testdrive-ci");
const agentScriptEntry = path.resolve(
  __dirname,
  "../../../../sf-repos/agentscript/packages/agentforce/dist/index.js",
);

describe("runScenarioProject", () => {
  it("runs weather scenario against AFDX testdrive agent", async () => {
    const result = await runScenarioProject({
      scenariosDir: path.join(exampleRoot, "scenarios"),
      agentScriptEntry,
    });

    expect(result.scenarios.length).toBe(1);
    expect(result.ok).toBe(true);
    expect(result.scenarios[0]?.action).toBe("check_weather");
    expect(result.scenarios[0]?.outputs?.maxTemperature).toBe(21);
  });
});
