import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverAgentFiles, lintProject } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testdriveRoot = path.resolve(
  __dirname,
  "../../../../sf-repos/afdx-pro-code-testdrive",
);
const agentScriptEntry = path.resolve(
  __dirname,
  "../../../../sf-repos/agentscript/packages/agentforce/dist/index.js",
);

describe("discoverAgentFiles", () => {
  it("finds Local_Info_Agent.agent in testdrive", async () => {
    const files = await discoverAgentFiles(testdriveRoot);
    expect(files.some((f) => f.endsWith("Local_Info_Agent.agent"))).toBe(true);
  });
});

describe("lintProject", () => {
  it("lints testdrive agent files without compile errors", async () => {
    const result = await lintProject({
      root: testdriveRoot,
      agentScriptEntry,
    });

    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.errorCount).toBe(0);
    expect(result.ok).toBe(true);
  });
});
