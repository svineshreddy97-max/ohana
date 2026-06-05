import fs from "node:fs";
import path from "node:path";
import { findConfigFile, loadConfig, makeColorizer, parseSimpleYaml } from "@ohana/core";
import { OHANA_RULES, normalizeSeverity } from "@ohana/lint";

export interface ValidateCommandOptions {
  path?: string;
  format?: "text" | "json";
  color?: boolean;
}

interface Issue {
  level: "error" | "warning";
  message: string;
}

const KNOWN_TOP_KEYS = new Set(["version", "lint", "sim"]);
const KNOWN_LINT_KEYS = new Set(["path", "globs", "fail_on_warning", "ignore", "rules"]);
const KNOWN_SIM_KEYS = new Set(["fixtures", "scenarios"]);
const VALID_RULE_IDS = new Set(OHANA_RULES.map((r) => r.id));

function validateConfig(parsed: Record<string, unknown>, configDir: string): Issue[] {
  const issues: Issue[] = [];

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_TOP_KEYS.has(key)) {
      issues.push({ level: "warning", message: `Unknown top-level key "${key}"` });
    }
  }

  if (parsed.version !== undefined && parsed.version !== 1) {
    issues.push({ level: "error", message: `Unsupported config version: ${parsed.version} (expected 1)` });
  }

  const lint = parsed.lint as Record<string, unknown> | undefined;
  if (lint && typeof lint === "object") {
    for (const key of Object.keys(lint)) {
      if (!KNOWN_LINT_KEYS.has(key)) {
        issues.push({ level: "warning", message: `Unknown lint key "${key}"` });
      }
    }
    if (lint.path !== undefined && typeof lint.path !== "string") {
      issues.push({ level: "error", message: `lint.path must be a string` });
    }
    if (lint.path && typeof lint.path === "string") {
      const resolved = path.resolve(configDir, lint.path);
      if (!fs.existsSync(resolved)) {
        issues.push({ level: "warning", message: `lint.path "${lint.path}" does not exist (${resolved})` });
      }
    }
    if (lint.globs !== undefined && !Array.isArray(lint.globs)) {
      issues.push({ level: "error", message: `lint.globs must be an array` });
    }
    if (lint.fail_on_warning !== undefined && typeof lint.fail_on_warning !== "boolean") {
      issues.push({ level: "error", message: `lint.fail_on_warning must be a boolean` });
    }
    if (lint.ignore !== undefined && !Array.isArray(lint.ignore)) {
      issues.push({ level: "error", message: `lint.ignore must be an array` });
    }
    if (lint.rules && typeof lint.rules === "object") {
      for (const [ruleId, value] of Object.entries(lint.rules as Record<string, unknown>)) {
        if (!VALID_RULE_IDS.has(ruleId)) {
          issues.push({ level: "warning", message: `Unknown rule "${ruleId}" in lint.rules` });
        }
        if (normalizeSeverity(value as string | number) === undefined) {
          issues.push({ level: "error", message: `Invalid severity "${value}" for rule "${ruleId}" (expected off/warn/error or 0/1/2)` });
        }
      }
    }
  }

  const sim = parsed.sim as Record<string, unknown> | undefined;
  if (sim && typeof sim === "object") {
    for (const key of Object.keys(sim)) {
      if (!KNOWN_SIM_KEYS.has(key)) {
        issues.push({ level: "warning", message: `Unknown sim key "${key}"` });
      }
    }
    for (const key of ["fixtures", "scenarios"] as const) {
      const val = sim[key];
      if (val !== undefined && typeof val !== "string") {
        issues.push({ level: "error", message: `sim.${key} must be a string` });
      }
      if (val && typeof val === "string") {
        const resolved = path.resolve(configDir, val);
        if (!fs.existsSync(resolved)) {
          issues.push({ level: "warning", message: `sim.${key} "${val}" does not exist (${resolved})` });
        }
      }
    }
  }

  return issues;
}

export async function validateCommand(options: ValidateCommandOptions = {}): Promise<number> {
  const cwd = options.path ?? process.cwd();
  const configPath = findConfigFile(cwd);

  if (!configPath) {
    if (options.format === "json") {
      console.log(JSON.stringify({ configPath: null, issues: [{ level: "error", message: "No .ohana/config.yaml found" }] }, null, 2));
    } else {
      console.error("No .ohana/config.yaml found. Run `ohana init` to create one.");
    }
    return 1;
  }

  const text = fs.readFileSync(configPath, "utf8");
  const parsed = parseSimpleYaml(text);
  const configDir = path.dirname(path.dirname(configPath));
  const issues = validateConfig(parsed, configDir);

  if (options.format === "json") {
    console.log(JSON.stringify({ configPath, issues }, null, 2));
    return issues.some((i) => i.level === "error") ? 1 : 0;
  }

  const c = makeColorizer(options.color ?? false);
  console.log(`Config: ${configPath}`);

  if (issues.length === 0) {
    console.log(c.green("OK — no issues found"));
    const { config } = loadConfig(cwd);
    console.log(`\nResolved config:`);
    console.log(`  lint.path: ${config.lint?.path ?? "."}`);
    console.log(`  lint.globs: ${JSON.stringify(config.lint?.globs)}`);
    console.log(`  lint.fail_on_warning: ${config.lint?.fail_on_warning ?? false}`);
    if (config.lint?.ignore?.length) {
      console.log(`  lint.ignore: ${JSON.stringify(config.lint.ignore)}`);
    }
    if (config.lint?.rules) {
      console.log(`  lint.rules: ${JSON.stringify(config.lint.rules)}`);
    }
    console.log(`  sim.fixtures: ${config.sim?.fixtures ?? "fixtures"}`);
    console.log(`  sim.scenarios: ${config.sim?.scenarios ?? "scenarios"}`);
    return 0;
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  console.log(
    errors.length > 0
      ? c.red(`FAILED (${errors.length} errors, ${warnings.length} warnings)`)
      : c.yellow(`${warnings.length} warning(s)`),
  );
  for (const issue of issues) {
    const sev = issue.level === "error" ? c.red("error") : c.yellow("warning");
    console.log(`  ${sev}: ${issue.message}`);
  }
  return errors.length > 0 ? 1 : 0;
}
