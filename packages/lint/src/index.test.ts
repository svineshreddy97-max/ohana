import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
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

  describe("extraIgnore", () => {
    const tmpDirs: string[] = [];
    afterEach(() => {
      for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
    });

    it("skips directories named in extraIgnore", async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "ohana-ignore-"));
      tmpDirs.push(root);
      fs.mkdirSync(path.join(root, "keep"));
      fs.mkdirSync(path.join(root, "vendor"));
      fs.writeFileSync(path.join(root, "keep", "A.agent"), "");
      fs.writeFileSync(path.join(root, "vendor", "B.agent"), "");

      const all = await discoverAgentFiles(root);
      expect(all.some((f) => f.endsWith("B.agent"))).toBe(true);

      const filtered = await discoverAgentFiles(root, undefined, ["vendor"]);
      expect(filtered.some((f) => f.endsWith("A.agent"))).toBe(true);
      expect(filtered.some((f) => f.endsWith("B.agent"))).toBe(false);
    });
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
