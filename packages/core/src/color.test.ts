import { describe, expect, it } from "vitest";
import { makeColorizer, shouldColorize } from "./color.js";

describe("makeColorizer", () => {
  it("wraps strings in ANSI codes when enabled", () => {
    const c = makeColorizer(true);
    expect(c.red("x")).toBe("\x1b[31mx\x1b[0m");
    expect(c.green("ok")).toBe("\x1b[32mok\x1b[0m");
  });

  it("is the identity when disabled", () => {
    const c = makeColorizer(false);
    expect(c.red("x")).toBe("x");
    expect(c.bold("y")).toBe("y");
    expect(c.enabled).toBe(false);
  });
});

describe("shouldColorize", () => {
  it("colorizes on a TTY", () => {
    expect(shouldColorize({ isTty: true })).toBe(true);
  });

  it("does not colorize off a TTY", () => {
    expect(shouldColorize({ isTty: false })).toBe(false);
  });

  it("respects NO_COLOR", () => {
    expect(shouldColorize({ isTty: true, noColorEnv: "1" })).toBe(false);
    // Empty string means the convention is not active.
    expect(shouldColorize({ isTty: true, noColorEnv: "" })).toBe(true);
  });

  it("respects an explicit --no-color", () => {
    expect(shouldColorize({ isTty: true, explicitNoColor: true })).toBe(false);
  });
});
