import fs from "node:fs";
import path from "node:path";

export type OutputFormat = "text" | "json" | "sarif" | "github" | "junit";

export interface ParsedArgs {
  command: string;
  options: Record<string, string | boolean>;
}

/**
 * Parse `argv` (already sliced past `node script`) into a command plus a flat
 * option map. `--flag value` captures the value; a bare `--flag` (followed by
 * another flag or nothing) becomes `true`. `-h`/`--help`/`help` short-circuit
 * to the `help` command.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = args.shift();

  if (!command || command === "-h" || command === "--help" || command === "help") {
    return { command: "help", options: {} };
  }

  if (command === "-v" || command === "--version" || command === "version") {
    return { command: "version", options: {} };
  }

  const options: Record<string, string | boolean> = {};

  while (args.length > 0) {
    const token = args.shift();
    if (!token) break;

    if (token === "-h" || token === "--help") {
      return { command: "help", options: {} };
    }

    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = args[0];
      if (next !== undefined && !next.startsWith("-")) {
        options[key] = args.shift()!;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

/** Options shared by the lint/sim/check commands. */
export interface SharedOptions {
  path?: string;
  format: OutputFormat;
  failOnWarning: boolean;
  agentScriptEntry?: string;
}

export function sharedOptions(options: Record<string, string | boolean>): SharedOptions {
  return {
    path: typeof options.path === "string" ? options.path : undefined,
    format: normalizeFormat(options.format),
    failOnWarning: options["fail-on-warning"] === true,
    agentScriptEntry:
      typeof options.agentscript === "string" ? options.agentscript : undefined,
  };
}

const OUTPUT_FORMATS: OutputFormat[] = ["text", "json", "sarif", "github", "junit"];

function normalizeFormat(value: string | boolean | undefined): OutputFormat {
  return typeof value === "string" && (OUTPUT_FORMATS as string[]).includes(value)
    ? (value as OutputFormat)
    : "text";
}

/** Read the CLI package version from its package.json (works from src and dist). */
export function getVersion(): string {
  try {
    const pkgPath = path.resolve(import.meta.dirname, "../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
