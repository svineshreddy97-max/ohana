import { describe, expect, it } from "vitest";
import { sortDiagnostics, type LintDiagnostic } from "./index.js";

function diag(line: number, column: number, message = "x"): LintDiagnostic {
  return { severity: "error", message, line, column, file: "a.agent" };
}

describe("sortDiagnostics", () => {
  it("orders by line then column", () => {
    const sorted = sortDiagnostics([diag(12, 3), diag(4, 9), diag(4, 1), diag(12, 1)]);
    expect(sorted.map((d) => [d.line, d.column])).toEqual([
      [4, 1],
      [4, 9],
      [12, 1],
      [12, 3],
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [diag(2, 1), diag(1, 1)];
    const copy = [...input];
    sortDiagnostics(input);
    expect(input).toEqual(copy);
  });
});
