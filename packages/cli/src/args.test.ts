import { describe, expect, it } from "vitest";
import { getVersion, parseArgs, sharedOptions } from "./args.js";

describe("parseArgs", () => {
  it("returns the help command for no args", () => {
    expect(parseArgs([])).toEqual({ command: "help", options: {} });
  });

  it("treats -h/--help/help as the help command", () => {
    expect(parseArgs(["-h"]).command).toBe("help");
    expect(parseArgs(["--help"]).command).toBe("help");
    expect(parseArgs(["help"]).command).toBe("help");
  });

  it("short-circuits to help when --help appears after a command", () => {
    expect(parseArgs(["lint", "--help"]).command).toBe("help");
  });

  it("treats -v/--version/version as the version command", () => {
    expect(parseArgs(["-v"]).command).toBe("version");
    expect(parseArgs(["--version"]).command).toBe("version");
    expect(parseArgs(["version"]).command).toBe("version");
  });

  it("captures --flag value pairs", () => {
    const { command, options } = parseArgs(["lint", "--path", "force-app"]);
    expect(command).toBe("lint");
    expect(options.path).toBe("force-app");
  });

  it("treats a bare flag followed by another flag as boolean true", () => {
    const { options } = parseArgs(["check", "--skip-sim", "--path", "x"]);
    expect(options["skip-sim"]).toBe(true);
    expect(options.path).toBe("x");
  });

  it("treats a trailing bare flag as boolean true", () => {
    const { options } = parseArgs(["lint", "--fail-on-warning"]);
    expect(options["fail-on-warning"]).toBe(true);
  });

  it("does not swallow a following flag as a value", () => {
    const { options } = parseArgs(["lint", "--path", "--fail-on-warning"]);
    expect(options.path).toBe(true);
    expect(options["fail-on-warning"]).toBe(true);
  });
});

describe("sharedOptions", () => {
  it("defaults format to text", () => {
    expect(sharedOptions({}).format).toBe("text");
  });

  it("recognizes json, sarif, github, and junit formats", () => {
    expect(sharedOptions({ format: "json" }).format).toBe("json");
    expect(sharedOptions({ format: "sarif" }).format).toBe("sarif");
    expect(sharedOptions({ format: "github" }).format).toBe("github");
    expect(sharedOptions({ format: "junit" }).format).toBe("junit");
  });

  it("falls back to text for an unknown format", () => {
    expect(sharedOptions({ format: "yaml" }).format).toBe("text");
  });

  it("maps path, fail-on-warning, and agentscript", () => {
    const shared = sharedOptions({
      path: "p",
      "fail-on-warning": true,
      agentscript: "/dist/index.js",
    });
    expect(shared.path).toBe("p");
    expect(shared.failOnWarning).toBe(true);
    expect(shared.agentScriptEntry).toBe("/dist/index.js");
  });

  it("ignores non-string path/agentscript values", () => {
    const shared = sharedOptions({ path: true, agentscript: true });
    expect(shared.path).toBeUndefined();
    expect(shared.agentScriptEntry).toBeUndefined();
  });
});

describe("getVersion", () => {
  it("returns the cli package version", () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
