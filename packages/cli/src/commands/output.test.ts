import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emitReport } from "./output.js";

describe("emitReport", () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  it("writes content to the given file, creating parent dirs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ohana-out-"));
    tmpDirs.push(root);
    const target = path.join(root, "nested", "report.sarif");
    emitReport('{"ok":true}', target);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe('{"ok":true}\n');
  });

  it("does not double-append a trailing newline", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ohana-out-"));
    tmpDirs.push(root);
    const target = path.join(root, "r.txt");
    emitReport("line\n", target);
    expect(fs.readFileSync(target, "utf8")).toBe("line\n");
  });
});
