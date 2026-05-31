import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runScenarioProject } from "./index.js";

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
