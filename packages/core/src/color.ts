/**
 * Tiny ANSI colorizer for terminal reports. When disabled (non-TTY, NO_COLOR,
 * or --no-color), every function is the identity, so output stays plain.
 */

const CODES = {
  red: 31,
  green: 32,
  yellow: 33,
  cyan: 36,
  bold: 1,
  dim: 2,
} as const;

export type ColorName = keyof typeof CODES;

export interface Colorizer {
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;
  bold(s: string): string;
  dim(s: string): string;
  enabled: boolean;
}

function wrap(enabled: boolean, code: number, s: string): string {
  return enabled ? `\x1b[${code}m${s}\x1b[0m` : s;
}

export function makeColorizer(enabled: boolean): Colorizer {
  return {
    enabled,
    red: (s) => wrap(enabled, CODES.red, s),
    green: (s) => wrap(enabled, CODES.green, s),
    yellow: (s) => wrap(enabled, CODES.yellow, s),
    cyan: (s) => wrap(enabled, CODES.cyan, s),
    bold: (s) => wrap(enabled, CODES.bold, s),
    dim: (s) => wrap(enabled, CODES.dim, s),
  };
}

/**
 * Decide whether to colorize, honoring the NO_COLOR convention
 * (https://no-color.org), an explicit opt-out, and TTY detection.
 */
export function shouldColorize(opts: {
  isTty?: boolean;
  noColorEnv?: string;
  explicitNoColor?: boolean;
}): boolean {
  if (opts.explicitNoColor) return false;
  if (opts.noColorEnv !== undefined && opts.noColorEnv !== "") return false;
  return opts.isTty === true;
}
