import { describe, expect, it } from "vitest";
import type { AgentIr, AgentNodeIr } from "@ohana/core";
import {
  OHANA_RULES,
  normalizeSeverity,
  resolveRuleSeverity,
  runOhanaRules,
} from "./rules.js";

/** Build a routing transition tool, encoded the way the compiler emits it. */
function transition(target: string): NonNullable<AgentNodeIr["tools"]>[number] {
  return {
    type: "action",
    target: "__state_update_action__",
    name: `go_to_${target}`,
    state_updates: [{ AgentScriptInternal_next_topic: `"${target}"` }],
  };
}

function ir(nodes: AgentNodeIr[], initial = nodes[0]?.developer_name): AgentIr {
  return { agent_version: { initial_node: initial, nodes } };
}

/** A minimal, fully-valid agent that should trip no rules. */
function cleanIr(): AgentIr {
  return ir([
    {
      developer_name: "router",
      description: "Routes the user to the right place.",
      type: "subagent",
      tools: [transition("weather")],
    },
    {
      developer_name: "weather",
      description: "Answers weather questions.",
      type: "subagent",
      tools: [{ type: "action", target: "check_weather", name: "check_weather" }],
      action_definitions: [
        {
          developer_name: "check_weather",
          description: "Fetch the forecast.",
          invocation_target_name: "CheckWeather",
          input_type: [
            { developer_name: "date", required: true, description: "The date." },
          ],
        },
      ],
    },
  ]);
}

function codes(ir: AgentIr, source = "", config?: Record<string, "error" | "warning" | "off">) {
  return runOhanaRules(ir, source, config).map((d) => d.code);
}

describe("runOhanaRules", () => {
  it("reports nothing for a clean agent", () => {
    expect(runOhanaRules(cleanIr(), "")).toEqual([]);
  });

  it("flags missing descriptions on subagents, actions, and required inputs", () => {
    const broken = ir([
      {
        developer_name: "router",
        description: "ok",
        type: "subagent",
        tools: [transition("weather")],
      },
      {
        developer_name: "weather",
        description: "  ", // blank
        type: "subagent",
        tools: [{ type: "action", target: "check_weather" }],
        action_definitions: [
          {
            developer_name: "check_weather",
            // no description
            invocation_target_name: "CheckWeather",
            input_type: [{ developer_name: "date", required: true }], // required, no description
          },
        ],
      },
    ]);
    const missing = runOhanaRules(broken, "").filter(
      (d) => d.code === "ohana/no-missing-description",
    );
    expect(missing).toHaveLength(3);
    expect(missing.every((d) => d.severity === "warning")).toBe(true);
  });

  it("does not flag optional inputs without descriptions", () => {
    const agent = ir([
      {
        developer_name: "weather",
        description: "ok",
        type: "subagent",
        tools: [{ type: "action", target: "a" }],
        action_definitions: [
          {
            developer_name: "a",
            description: "ok",
            invocation_target_name: "T",
            input_type: [{ developer_name: "opt", required: false }],
          },
        ],
      },
    ]);
    expect(codes(agent)).not.toContain("ohana/no-missing-description");
  });

  it("flags non-snake_case developer names when the rule is enabled", () => {
    const agent = ir([
      {
        developer_name: "Weather", // PascalCase
        description: "ok",
        type: "subagent",
        tools: [{ type: "action", target: "checkWeather" }],
        action_definitions: [
          { developer_name: "checkWeather", description: "ok", invocation_target_name: "T" },
        ],
      },
    ]);
    const config = { "ohana/naming-convention": "warning" as const };
    expect(codes(agent, "", config).filter((c) => c === "ohana/naming-convention")).toHaveLength(
      2,
    );
  });

  it("does not flag non-snake_case names when naming-convention is off by default", () => {
    const agent = ir([
      {
        developer_name: "Weather",
        description: "ok",
        type: "subagent",
        tools: [{ type: "action", target: "checkWeather" }],
        action_definitions: [
          { developer_name: "checkWeather", description: "ok", invocation_target_name: "T" },
        ],
      },
    ]);
    expect(codes(agent)).not.toContain("ohana/naming-convention");
  });

  it("flags a transition to an undefined subagent as an error", () => {
    const agent = ir([
      {
        developer_name: "router",
        description: "ok",
        type: "subagent",
        tools: [transition("nope")],
      },
    ]);
    const dangling = runOhanaRules(agent, "").filter(
      (d) => d.code === "ohana/dangling-transition",
    );
    expect(dangling).toHaveLength(1);
    expect(dangling[0].severity).toBe("error");
  });

  it("ignores internal pseudo-destinations like __human__", () => {
    const agent = ir([
      {
        developer_name: "escalation",
        description: "ok",
        type: "subagent",
        tools: [
          {
            type: "action",
            target: "__state_update_action__",
            state_updates: [{ AgentScriptInternal_next_topic: "'__human__'" }],
          },
        ],
      },
    ]);
    expect(codes(agent)).not.toContain("ohana/dangling-transition");
    expect(codes(agent)).not.toContain("ohana/unreachable-subagent");
  });

  it("flags a subagent unreachable from the initial node", () => {
    const agent = ir(
      [
        { developer_name: "router", description: "ok", type: "subagent", tools: [transition("a")] },
        { developer_name: "a", description: "ok", type: "subagent" },
        { developer_name: "orphan", description: "ok", type: "subagent" },
      ],
      "router",
    );
    const unreachable = runOhanaRules(agent, "").filter(
      (d) => d.code === "ohana/unreachable-subagent",
    );
    expect(unreachable).toHaveLength(1);
    expect(unreachable[0].message).toContain("orphan");
  });

  it("does not run reachability when the initial node is unknown", () => {
    const agent = ir(
      [
        { developer_name: "a", description: "ok", type: "subagent" },
        { developer_name: "b", description: "ok", type: "subagent" },
      ],
      "missing",
    );
    expect(codes(agent)).not.toContain("ohana/unreachable-subagent");
  });

  it("flags an action with no invocation target as an error", () => {
    const agent = ir([
      {
        developer_name: "weather",
        description: "ok",
        type: "subagent",
        tools: [{ type: "action", target: "a" }],
        action_definitions: [{ developer_name: "a", description: "ok" }],
      },
    ]);
    const missing = runOhanaRules(agent, "").filter(
      (d) => d.code === "ohana/missing-action-target",
    );
    expect(missing).toHaveLength(1);
    expect(missing[0].severity).toBe("error");
  });

  it("flags an action defined but never wired into reasoning", () => {
    const agent = ir([
      {
        developer_name: "weather",
        description: "ok",
        type: "subagent",
        tools: [], // nothing references the action
        action_definitions: [
          { developer_name: "orphan_action", description: "ok", invocation_target_name: "T" },
        ],
      },
    ]);
    expect(codes(agent)).toContain("ohana/no-unused-action");
  });

  it("flags duplicate subagent and action developer names once each", () => {
    const agent = ir([
      {
        developer_name: "dup",
        description: "ok",
        type: "subagent",
        tools: [{ type: "action", target: "a" }],
        action_definitions: [
          { developer_name: "a", description: "ok", invocation_target_name: "T" },
          { developer_name: "a", description: "ok", invocation_target_name: "T" },
        ],
      },
      { developer_name: "dup", description: "ok", type: "subagent" },
    ]);
    const dups = runOhanaRules(agent, "").filter(
      (d) => d.code === "ohana/duplicate-developer-name",
    );
    expect(dups).toHaveLength(2);
    expect(dups.every((d) => d.severity === "error")).toBe(true);
  });

  it("resolves a best-effort source line for subagent anchors", () => {
    const source = "line one\nsubagent weather:\n    label: x\n";
    const agent = ir([
      { developer_name: "weather", type: "subagent" }, // missing description
    ]);
    const diag = runOhanaRules(agent, source).find(
      (d) => d.code === "ohana/no-missing-description",
    );
    expect(diag?.line).toBe(2);
  });

  it("falls back to line 1 when the anchor is not found in source", () => {
    const agent = ir([{ developer_name: "weather", type: "subagent" }]);
    const diag = runOhanaRules(agent, "unrelated content").find(
      (d) => d.code === "ohana/no-missing-description",
    );
    expect(diag?.line).toBe(1);
  });
});

describe("rule severity configuration", () => {
  it("disables a rule set to off", () => {
    const agent = ir([{ developer_name: "weather", type: "subagent", description: "" }]);
    expect(codes(agent, "", { "ohana/no-missing-description": "off" })).not.toContain(
      "ohana/no-missing-description",
    );
  });

  it("escalates a default-warning rule to error", () => {
    const agent = ir([{ developer_name: "Weather", type: "subagent", description: "ok" }]);
    const diag = runOhanaRules(agent, "", { "ohana/naming-convention": "error" }).find(
      (d) => d.code === "ohana/naming-convention",
    );
    expect(diag?.severity).toBe("error");
  });

  it("resolveRuleSeverity falls back to the default", () => {
    const naming = OHANA_RULES.find((r) => r.id === "ohana/naming-convention")!;
    expect(resolveRuleSeverity(naming)).toBe("off");
    expect(resolveRuleSeverity(naming, { "ohana/naming-convention": "warn" })).toBe("warning");
  });
});

describe("OHANA_RULES metadata", () => {
  it("exposes a stable id, description, and default severity for each rule", () => {
    expect(OHANA_RULES.length).toBeGreaterThan(0);
    for (const rule of OHANA_RULES) {
      expect(rule.id).toMatch(/^ohana\//);
      expect(rule.description.length).toBeGreaterThan(0);
      expect(["error", "warning", "off"]).toContain(rule.defaultSeverity);
    }
  });

  it("has unique rule ids", () => {
    const ids = OHANA_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
