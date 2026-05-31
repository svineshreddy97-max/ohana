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
});

describe("loadConfig", () => {
  it("returns defaults when no config file", () => {
    const { config } = loadConfig("/nonexistent/path/that/has/no/config");
    expect(config.lint?.path).toBe(".");
  });
});
