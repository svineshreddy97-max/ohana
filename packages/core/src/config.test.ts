import { describe, expect, it } from "vitest";
import { loadConfig, parseSimpleYaml } from "./config.js";

describe("parseSimpleYaml", () => {
  it("parses nested config", () => {
    const parsed = parseSimpleYaml(`version: 1
lint:
  path: force-app
  fail_on_warning: true
sim:
  fixtures: fixtures
`);
    expect(parsed.version).toBe(1);
    expect((parsed.lint as Record<string, unknown>).path).toBe("force-app");
    expect((parsed.lint as Record<string, unknown>).fail_on_warning).toBe(true);
  });

  it("parses a block sequence into an array", () => {
    const parsed = parseSimpleYaml(`lint:
  globs:
    - "**/*.agent"
    - force-app/**/*.agent
  path: force-app
`);
    const lint = parsed.lint as Record<string, unknown>;
    expect(lint.globs).toEqual(["**/*.agent", "force-app/**/*.agent"]);
    // A sibling key after the sequence still attaches to the right parent.
    expect(lint.path).toBe("force-app");
  });

  it("parses a flow array", () => {
    const parsed = parseSimpleYaml(`lint:
  globs: ["a/**/*.agent", "b.agent"]
`);
    expect((parsed.lint as Record<string, unknown>).globs).toEqual([
      "a/**/*.agent",
      "b.agent",
    ]);
  });

  it("parses an empty flow array", () => {
    const parsed = parseSimpleYaml(`lint:\n  globs: []\n`);
    expect((parsed.lint as Record<string, unknown>).globs).toEqual([]);
  });
});

describe("loadConfig", () => {
  it("returns defaults when no config file", () => {
    const { config } = loadConfig("/nonexistent/path/that/has/no/config");
    expect(config.lint?.path).toBe(".");
  });
});
