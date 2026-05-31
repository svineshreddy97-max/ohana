import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scaffold } from "./init.js";

describe("scaffold", () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  function tmp(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ohana-init-"));
    tmpDirs.push(root);
    return root;
  }

  it("creates config and scenario/fixture scaffolding", () => {
    const root = tmp();
    const result = scaffold(root);
    expect(result.created).toEqual([
      path.join(".ohana", "config.yaml"),
      path.join("scenarios", "README.md"),
      path.join("fixtures", "README.md"),
    ]);
    expect(result.skipped).toEqual([]);
    expect(fs.existsSync(path.join(root, ".ohana", "config.yaml"))).toBe(true);
    expect(fs.readFileSync(path.join(root, ".ohana", "config.yaml"), "utf8")).toContain(
      "version: 1",
    );
  });

  it("is idempotent — never overwrites existing files", () => {
    const root = tmp();
    const configPath = path.join(root, ".ohana", "config.yaml");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "version: 99\n");

    const result = scaffold(root);
    expect(result.skipped).toContain(path.join(".ohana", "config.yaml"));
    // Existing content preserved.
    expect(fs.readFileSync(configPath, "utf8")).toBe("version: 99\n");
    // The other scaffolding was still created.
    expect(result.created).toContain(path.join("scenarios", "README.md"));
  });
});
