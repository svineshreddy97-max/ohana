import { describe, expect, it } from "vitest";
import { buildJUnitXml } from "./junit.js";

describe("buildJUnitXml", () => {
  it("renders passing and failing cases in a single suite", () => {
    const xml = buildJUnitXml([
      {
        name: "ohana lint",
        cases: [
          { name: "agents/A.agent", classname: "ohana.lint" },
          {
            name: "agents/B.agent",
            classname: "ohana.lint",
            failures: [
              {
                message: "1 error(s), 0 warning(s)",
                type: "lint",
                details: "error 2:1 [ohana/compile] Unexpected token",
              },
            ],
          },
        ],
      },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites name="ohana" tests="2" failures="1" errors="0">');
    expect(xml).toContain('<testsuite name="ohana lint" tests="2" failures="1"');
    expect(xml).toContain('<testcase name="agents/A.agent" classname="ohana.lint"/>');
    expect(xml).toContain("Unexpected token");
  });

  it("records warnings in system-out without failing the case", () => {
    const xml = buildJUnitXml([
      {
        name: "ohana lint",
        cases: [
          {
            name: "A.agent",
            classname: "ohana.lint",
            systemOut: "warning 3:1 [ohana/no-missing-description] missing",
          },
        ],
      },
    ]);

    expect(xml).toContain('<testsuite name="ohana lint" tests="1" failures="0"');
    expect(xml).toContain("<system-out>warning 3:1");
    expect(xml).not.toContain("<failure");
  });

  it("escapes XML special characters in attributes and text", () => {
    const xml = buildJUnitXml([
      {
        name: "suite",
        cases: [
          {
            name: 'file "A".agent',
            failures: [{ message: "a < b & c", details: "line 1: x > y" }],
          },
        ],
      },
    ]);

    expect(xml).toContain('name="file &quot;A&quot;.agent"');
    expect(xml).toContain('message="a &lt; b &amp; c"');
    expect(xml).toContain("line 1: x &gt; y");
  });

  it("omits timestamps for deterministic output", () => {
    const xml = buildJUnitXml([{ name: "suite", cases: [{ name: "a" }] }]);
    expect(xml).not.toContain("timestamp=");
  });
});
