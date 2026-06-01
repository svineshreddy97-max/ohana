import type {
  AgentActionIr,
  AgentDiagnostic,
  AgentIr,
  AgentNodeIr,
} from "@ohana/core";

/**
 * Ohana semantic lint rules.
 *
 * The Agent Script compiler (via `@ohana/core`) reports syntax and type
 * diagnostics. These rules run on top of the compiled intermediate
 * representation to flag *authoring* problems the compiler accepts but that
 * degrade an agent's quality at runtime — missing descriptions the planner
 * relies on, unreachable subagents, dangling routing transitions, and so on.
 *
 * Each rule has a stable id (`ohana/<name>`, mirroring the ESLint plugin-rule
 * convention) so it can be referenced in SARIF output and toggled per project
 * via `lint.rules` in `.ohana/config.yaml`. Severities follow ESLint's model —
 * `off` / `warn` / `error` (numeric `0` / `1` / `2` also accepted).
 *
 * Scope is deliberately the *agent-graph* layer the Agent Script compiler does
 * not cover (orphan subagents, unused actions, description quality). The
 * compiler already reports undefined references, required fields, duplicate
 * keys, etc.; these rules only run when the compiler succeeds, so they never
 * double-report a problem the compiler already caught.
 */

export type RuleSeverity = "error" | "warning" | "off";

/**
 * Per-rule severity overrides, e.g. `{ "ohana/naming-convention": "warn" }`.
 * Accepts ESLint-style names (`off`/`warn`/`error`), the long form `warning`,
 * and numeric `0`/`1`/`2`. Values come straight from YAML, so the type is loose
 * and normalized at lookup time.
 */
export type RuleSeverityConfig = Record<string, string | number>;

export interface RuleMeta {
  id: string;
  description: string;
  defaultSeverity: RuleSeverity;
}

type AnchorKind = "subagent" | "action" | "name";

interface AnchorSpec {
  kind: AnchorKind;
  name: string;
}

interface RuleFinding {
  message: string;
  /** Used to locate a source line/column for the diagnostic (best effort). */
  anchor?: AnchorSpec;
}

interface Rule extends RuleMeta {
  check(ir: AgentIr): RuleFinding[];
}

/** The compiler keys a routing transition's destination topic in a state write. */
const NEXT_TOPIC_KEY = "AgentScriptInternal_next_topic";
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

function subagentNodes(ir: AgentIr): AgentNodeIr[] {
  return ir.agent_version?.nodes ?? [];
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/** Internal pseudo-destinations like `__human__`/`__end__` are not subagents. */
function isSpecialTarget(name: string): boolean {
  return name.startsWith("__") && name.endsWith("__");
}

function stripQuotes(value: string): string {
  const t = value.trim();
  if (
    t.length >= 2 &&
    ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/** Topics this subagent can route to, decoded from its tools' state writes. */
function transitionTargets(node: AgentNodeIr): string[] {
  const targets: string[] = [];
  for (const tool of node.tools ?? []) {
    for (const update of tool.state_updates ?? []) {
      const raw = update[NEXT_TOPIC_KEY];
      if (typeof raw === "string") {
        targets.push(stripQuotes(raw));
      }
    }
  }
  return targets;
}

function actionLabel(node: AgentNodeIr, action: AgentActionIr): string {
  return `${node.developer_name}.${action.developer_name}`;
}

const RULES: Rule[] = [
  {
    id: "ohana/no-missing-description",
    description:
      "Subagents, actions, and required inputs should have a non-empty description — the planner uses them to choose what to invoke.",
    defaultSeverity: "warning",
    check(ir) {
      const findings: RuleFinding[] = [];
      for (const node of subagentNodes(ir)) {
        if (isBlank(node.description)) {
          findings.push({
            message: `Subagent "${node.developer_name}" has no description.`,
            anchor: { kind: "subagent", name: node.developer_name },
          });
        }
        for (const action of node.action_definitions ?? []) {
          if (isBlank(action.description)) {
            findings.push({
              message: `Action "${actionLabel(node, action)}" has no description.`,
              anchor: { kind: "action", name: action.developer_name },
            });
          }
          for (const input of action.input_type ?? []) {
            if (input.required && isBlank(input.description)) {
              findings.push({
                message: `Required input "${input.developer_name}" of action "${actionLabel(node, action)}" has no description.`,
                anchor: { kind: "name", name: input.developer_name },
              });
            }
          }
        }
      }
      return findings;
    },
  },
  {
    id: "ohana/naming-convention",
    description:
      "Subagent and action developer_names should be snake_case. Off by default — Agent Script mandates no casing convention (Salesforce examples use PascalCase, the testdrive uses snake_case); enable it to enforce one consistently in your project.",
    defaultSeverity: "off",
    check(ir) {
      const findings: RuleFinding[] = [];
      for (const node of subagentNodes(ir)) {
        if (!SNAKE_CASE.test(node.developer_name)) {
          findings.push({
            message: `Subagent "${node.developer_name}" is not snake_case.`,
            anchor: { kind: "subagent", name: node.developer_name },
          });
        }
        for (const action of node.action_definitions ?? []) {
          if (!SNAKE_CASE.test(action.developer_name)) {
            findings.push({
              message: `Action "${actionLabel(node, action)}" is not snake_case.`,
              anchor: { kind: "action", name: action.developer_name },
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "ohana/dangling-transition",
    description: "A routing transition must target a subagent that exists.",
    defaultSeverity: "error",
    check(ir) {
      const names = new Set(subagentNodes(ir).map((n) => n.developer_name));
      const findings: RuleFinding[] = [];
      for (const node of subagentNodes(ir)) {
        for (const target of transitionTargets(node)) {
          if (isSpecialTarget(target) || names.has(target)) {
            continue;
          }
          findings.push({
            message: `Subagent "${node.developer_name}" routes to "${target}", which is not a defined subagent.`,
            anchor: { kind: "subagent", name: node.developer_name },
          });
        }
      }
      return findings;
    },
  },
  {
    id: "ohana/unreachable-subagent",
    description:
      "Every subagent should be reachable from the initial node through routing transitions.",
    defaultSeverity: "warning",
    check(ir) {
      const nodes = subagentNodes(ir);
      const initial = ir.agent_version?.initial_node;
      const byName = new Map(nodes.map((n) => [n.developer_name, n]));
      // Without a valid entry point, reachability is undefined — skip rather
      // than flag every subagent (a missing initial node is its own concern).
      if (!initial || !byName.has(initial) || nodes.length <= 1) {
        return [];
      }

      const reachable = new Set<string>([initial]);
      const queue = [initial];
      while (queue.length > 0) {
        const current = byName.get(queue.shift()!)!;
        for (const target of transitionTargets(current)) {
          if (byName.has(target) && !reachable.has(target)) {
            reachable.add(target);
            queue.push(target);
          }
        }
      }

      return nodes
        .filter((n) => !reachable.has(n.developer_name))
        .map((n) => ({
          message: `Subagent "${n.developer_name}" is not reachable from the initial node "${initial}".`,
          anchor: { kind: "subagent" as const, name: n.developer_name },
        }));
    },
  },
  {
    id: "ohana/missing-action-target",
    description: "Each action must declare an invocation target (e.g. apex:// or flow://).",
    defaultSeverity: "error",
    check(ir) {
      const findings: RuleFinding[] = [];
      for (const node of subagentNodes(ir)) {
        for (const action of node.action_definitions ?? []) {
          if (isBlank(action.invocation_target_name)) {
            findings.push({
              message: `Action "${actionLabel(node, action)}" has no invocation target.`,
              anchor: { kind: "action", name: action.developer_name },
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "ohana/no-unused-action",
    description:
      "An action defined on a subagent should be wired into its reasoning (referenced by a tool).",
    defaultSeverity: "warning",
    check(ir) {
      const findings: RuleFinding[] = [];
      for (const node of subagentNodes(ir)) {
        const wired = new Set(
          (node.tools ?? [])
            .map((t) => t.target)
            .filter((t): t is string => typeof t === "string"),
        );
        for (const action of node.action_definitions ?? []) {
          if (!wired.has(action.developer_name)) {
            findings.push({
              message: `Action "${actionLabel(node, action)}" is defined but never used by the subagent's reasoning.`,
              anchor: { kind: "action", name: action.developer_name },
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: "ohana/duplicate-developer-name",
    description:
      "Subagent developer_names must be unique, and action developer_names must be unique within a subagent.",
    defaultSeverity: "error",
    check(ir) {
      const findings: RuleFinding[] = [];
      const nodes = subagentNodes(ir);

      const seenSubagents = new Set<string>();
      const reportedSubagents = new Set<string>();
      for (const node of nodes) {
        if (seenSubagents.has(node.developer_name) && !reportedSubagents.has(node.developer_name)) {
          findings.push({
            message: `Duplicate subagent developer_name "${node.developer_name}".`,
            anchor: { kind: "subagent", name: node.developer_name },
          });
          reportedSubagents.add(node.developer_name);
        }
        seenSubagents.add(node.developer_name);
      }

      for (const node of nodes) {
        const seenActions = new Set<string>();
        const reportedActions = new Set<string>();
        for (const action of node.action_definitions ?? []) {
          if (seenActions.has(action.developer_name) && !reportedActions.has(action.developer_name)) {
            findings.push({
              message: `Duplicate action developer_name "${action.developer_name}" in subagent "${node.developer_name}".`,
              anchor: { kind: "action", name: action.developer_name },
            });
            reportedActions.add(action.developer_name);
          }
          seenActions.add(action.developer_name);
        }
      }

      return findings;
    },
  },
];

/** Public metadata for every built-in rule (id, description, default severity). */
export const OHANA_RULES: RuleMeta[] = RULES.map(({ check: _check, ...meta }) => meta);

/** Normalize an ESLint-style severity (`off`/`warn`/`error`, `0`/`1`/`2`) or the long `warning` form. */
export function normalizeSeverity(value: string | number | undefined): RuleSeverity | undefined {
  switch (value) {
    case "off":
    case 0:
      return "off";
    case "warn":
    case "warning":
    case 1:
      return "warning";
    case "error":
    case 2:
      return "error";
    default:
      return undefined;
  }
}

export function resolveRuleSeverity(
  rule: RuleMeta,
  config?: RuleSeverityConfig,
): RuleSeverity {
  return normalizeSeverity(config?.[rule.id]) ?? rule.defaultSeverity;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Best-effort source location for a finding. The compiled IR carries no source
 * positions, so we scan the original `.agent` text for the declaration. Falls
 * back to 1:1 when nothing matches — diagnostics stay attached to the file.
 */
function resolveAnchor(source: string, anchor?: AnchorSpec): { line: number; column: number } {
  if (!anchor) {
    return { line: 1, column: 1 };
  }
  const name = escapeRegExp(anchor.name);
  const patterns: RegExp[] = [];
  if (anchor.kind === "subagent") {
    // Accept both the canonical `subagent`/`start_agent` and the deprecated `topic` block.
    patterns.push(new RegExp(`\\b(?:subagent|topic|start_agent)\\s+${name}\\b`));
  } else if (anchor.kind === "action") {
    patterns.push(new RegExp(`^\\s*${name}\\s*:`));
  }
  patterns.push(new RegExp(`\\b${name}\\b`));

  const lines = source.split(/\r?\n/);
  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const match = pattern.exec(lines[i]);
      if (match) {
        return { line: i + 1, column: (match.index ?? 0) + 1 };
      }
    }
  }
  return { line: 1, column: 1 };
}

/**
 * Run every enabled rule over a compiled agent and return diagnostics shaped
 * like the compiler's, so callers can merge the two streams transparently.
 */
export function runOhanaRules(
  ir: AgentIr,
  source: string,
  config?: RuleSeverityConfig,
): AgentDiagnostic[] {
  const diagnostics: AgentDiagnostic[] = [];
  for (const rule of RULES) {
    const severity = resolveRuleSeverity(rule, config);
    if (severity === "off") {
      continue;
    }
    for (const finding of rule.check(ir)) {
      const { line, column } = resolveAnchor(source, finding.anchor);
      diagnostics.push({
        severity,
        message: finding.message,
        code: rule.id,
        source: "ohana",
        line,
        column,
      });
    }
  }
  return diagnostics;
}
