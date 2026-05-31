import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverAgentFiles, lintProject } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Self-contained: the example vendors a copy of the AFDX testdrive agent, and the
// agentscript toolchain is resolved by resolveAgentScriptEntry (sibling checkout or the
// repo-local .agentscript cache from `pnpm ensure:agentscript`).
const exampleRoot = path.resolve(__dirname, "../../../examples/testdrive-ci");

describe("discoverAgentFiles", () => {
  it("finds the vendored Local_Info_Agent.agent in the example", async () => {
    const files = await discoverAgentFiles(exampleRoot);
    expect(files.some((f) => f.endsWith("Local_Info_Agent.agent"))).toBe(true);
  });
});

describe("lintProject", () => {
  it("lints the example agent files without compile errors", async () => {
    const result = await lintProject({
      root: exampleRoot,
    });

    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.errorCount).toBe(0);
    expect(result.ok).toBe(true);
  });
});
