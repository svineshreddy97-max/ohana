import { loadConfig, makeColorizer } from "@ohana/core";
import { OHANA_RULES, resolveRuleSeverity, type RuleSeverityConfig } from "@ohana/lint";

export interface RulesCommandOptions {
  path?: string;
  format?: "text" | "json";
  color?: boolean;
}

export async function rulesCommand(options: RulesCommandOptions = {}): Promise<number> {
  const { config } = loadConfig(options.path ?? process.cwd());
  const ruleConfig: RuleSeverityConfig | undefined = config.lint?.rules;

  if (options.format === "json") {
    const data = OHANA_RULES.map((rule) => ({
      id: rule.id,
      description: rule.description,
      defaultSeverity: rule.defaultSeverity,
      severity: resolveRuleSeverity(rule, ruleConfig),
    }));
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }

  const c = makeColorizer(options.color ?? false);
  console.log(`Ohana lint rules (${OHANA_RULES.length} available)\n`);
  for (const rule of OHANA_RULES) {
    const effective = resolveRuleSeverity(rule, ruleConfig);
    const sevLabel =
      effective === "error"
        ? c.red(effective)
        : effective === "warning"
          ? c.yellow(effective)
          : c.dim(effective);
    const override = ruleConfig?.[rule.id] !== undefined ? ` ${c.dim("(configured)")}` : "";
    console.log(`  ${c.bold(rule.id)}  [${sevLabel}]${override}`);
    console.log(`    ${c.dim(rule.description)}\n`);
  }
  return 0;
}
