import fs from "node:fs";
import path from "node:path";

/**
 * Emit a formatted report. With `outPath`, write it to that file (creating
 * parent dirs) and log a short confirmation to stderr — keeping stdout free so
 * the file is the single source of truth. Otherwise print to stdout.
 */
export function emitReport(content: string, outPath?: string): void {
  if (!outPath) {
    console.log(content);
    return;
  }
  const resolved = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  console.error(`Wrote report to ${resolved}`);
}
