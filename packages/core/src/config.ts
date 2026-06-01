import fs from "node:fs";
import path from "node:path";

export interface OhanaConfig {
  version: number;
  lint?: {
    path?: string;
    globs?: string[];
    fail_on_warning?: boolean;
    /** Extra directory names to skip during discovery, on top of the defaults. */
    ignore?: string[];
    /** Per-rule severity overrides for the Ohana semantic rules: off | warn | error (0 | 1 | 2). */
    rules?: Record<string, string | number>;
  };
  sim?: {
    fixtures?: string;
    scenarios?: string;
  };
}

const DEFAULT_CONFIG: OhanaConfig = {
  version: 1,
  lint: {
    path: ".",
    globs: ["**/*.agent", "**/aiAuthoringBundles/**/*.agent"],
  },
  sim: {
    fixtures: "fixtures",
    scenarios: "scenarios",
  },
};

export function findConfigFile(startDir: string): string | undefined {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, ".ohana", "config.yaml");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const alt = path.join(dir, ".ohana.yaml");
    if (fs.existsSync(alt)) {
      return alt;
    }
    if (dir === root) {
      return undefined;
    }
    dir = path.dirname(dir);
  }
}

/**
 * Minimal YAML subset parser for Ohana config (no dependency). Supports nested
 * maps, scalars, flow arrays (`globs: ["a", "b"]`), and block sequences:
 *
 *   globs:
 *     - "**\/*.agent"
 *     - force-app/**\/*.agent
 */
export function parseSimpleYaml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [
    { indent: -1, obj: root },
  ];
  // The most recent `key:` with an empty value, so block-sequence items ("- x")
  // that follow on deeper-indented lines can attach to it as an array.
  let pending: { indent: number; key: string; obj: Record<string, unknown> } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    const indent = line.match(/^ */)![0].length;
    const trimmed = line.trim();

    const seq = trimmed.match(/^-\s+(.*)$/);
    if (seq) {
      if (pending && indent > pending.indent) {
        let arr = pending.obj[pending.key];
        if (!Array.isArray(arr)) {
          arr = [];
          pending.obj[pending.key] = arr;
        }
        (arr as unknown[]).push(parseScalar(seq[1].trim()));
      }
      continue;
    }

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;

    const key = parseScalar(match[1].trim()) as string;
    const valueRaw = match[2].trim();
    const parent = stack[stack.length - 1].obj;

    if (valueRaw === "") {
      // Tentatively a nested map; a following "- " sequence converts it to an array.
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      pending = { indent, key, obj: parent };
      continue;
    }

    parent[key] = parseScalar(valueRaw);
    pending = null;
  }

  return root;
}

function parseScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    return parseFlowArray(value);
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFlowArray(value: string): unknown[] {
  const inner = value.slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((item) => parseScalar(item.trim()));
}

export function loadConfig(startDir: string = process.cwd()): {
  config: OhanaConfig;
  configPath?: string;
} {
  const configPath = findConfigFile(startDir);
  if (!configPath) {
    return { config: DEFAULT_CONFIG };
  }

  const text = fs.readFileSync(configPath, "utf8");
  const parsed = parseSimpleYaml(text);
  return {
    configPath,
    config: mergeConfig(DEFAULT_CONFIG, parsed as Partial<OhanaConfig>),
  };
}

function mergeConfig(base: OhanaConfig, override: Partial<OhanaConfig>): OhanaConfig {
  return {
    version: typeof override.version === "number" ? override.version : base.version,
    lint: { ...base.lint, ...(override.lint as OhanaConfig["lint"]) },
    sim: { ...base.sim, ...(override.sim as OhanaConfig["sim"]) },
  };
}

export function resolveFromRoot(root: string, relative?: string): string {
  if (!relative) return root;
  return path.resolve(root, relative);
}
