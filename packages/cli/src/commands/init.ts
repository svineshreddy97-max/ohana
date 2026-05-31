import fs from "node:fs";
import path from "node:path";

const CONFIG_TEMPLATE = `version: 1

lint:
  path: .
  fail_on_warning: false
  # globs:
  #   - "**/*.agent"
  # ignore:
  #   - vendor

sim:
  scenarios: scenarios
  fixtures: fixtures
`;

const SCENARIOS_README = `# Scenarios

Offline \`ohana sim\` scenarios. Each \`*.json\` (or \`*.yaml\`) routes an utterance
to a subagent and action, optionally mocks the action via a fixture, and
asserts on outputs. See https://github.com/svineshreddy97-max/ohana for the
schema.
`;

const FIXTURES_README = `# Fixtures

Mocked action outputs for \`ohana sim\`. Each fixture lists \`mocks\` matched by
input values, with an optional \`{ "default": true }\` fallback.
`;

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
}

/** Write the starter files under `root`, never overwriting existing ones. */
export function scaffold(root: string): ScaffoldResult {
  const created: string[] = [];
  const skipped: string[] = [];

  const writeFile = (relPath: string, contents: string) => {
    const target = path.join(root, relPath);
    if (fs.existsSync(target)) {
      skipped.push(relPath);
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, "utf8");
    created.push(relPath);
  };

  writeFile(path.join(".ohana", "config.yaml"), CONFIG_TEMPLATE);
  writeFile(path.join("scenarios", "README.md"), SCENARIOS_README);
  writeFile(path.join("fixtures", "README.md"), FIXTURES_README);

  return { created, skipped };
}

export interface InitCommandOptions {
  path?: string;
}

export async function initCommand(options: InitCommandOptions = {}): Promise<number> {
  const root = path.resolve(options.path ?? process.cwd());
  const { created, skipped } = scaffold(root);

  console.log(`Ohana init — ${root}`);
  for (const f of created) console.log(`  + ${f}`);
  for (const f of skipped) console.log(`  · ${f} (exists, left as-is)`);

  if (created.length === 0) {
    console.log("\nNothing to do — project already initialized.");
  } else {
    console.log("\nNext: add a .agent file, then run `ohana check`.");
  }
  return 0;
}
