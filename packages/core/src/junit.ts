/**
 * Minimal JUnit XML writer (no dependency).
 *
 * JUnit XML is the lingua franca for CI test reporting — GitHub Actions test
 * reporters (e.g. dorny/test-reporter), GitLab, Jenkins, and CircleCI all
 * consume it. Ohana adapts its lint and sim results to the generic suite/case
 * model below, then renders them with `buildJUnitXml`.
 *
 * Output is deterministic: no timestamps or wall-clock durations are emitted
 * unless a caller supplies them, so reports diff cleanly across runs.
 */

export interface JUnitFailure {
  message: string;
  type?: string;
  details?: string;
}

export interface JUnitTestCase {
  name: string;
  classname?: string;
  /** Seconds; omitted from output when undefined. */
  time?: number;
  /** Zero failures => the case passed. Multiple => multiple <failure> elements. */
  failures?: JUnitFailure[];
  skipped?: boolean;
  systemOut?: string;
}

export interface JUnitTestSuite {
  name: string;
  cases: JUnitTestCase[];
  /** ISO-8601; omitted from output when undefined (kept undefined for determinism). */
  timestamp?: string;
}

/**
 * Drop characters XML 1.0 forbids so the document stays well-formed. Allowed:
 * #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]. Implemented as a code-unit
 * scan to keep the source ASCII-only.
 */
function stripInvalidXmlChars(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (
      c === 0x09 ||
      c === 0x0a ||
      c === 0x0d ||
      (c >= 0x20 && c <= 0xd7ff) ||
      (c >= 0xe000 && c <= 0xfffd)
    ) {
      out += value[i];
    }
  }
  return out;
}

function escapeText(value: string): string {
  return stripInvalidXmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/\t/g, "&#9;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;");
}

function attr(name: string, value: string | number | undefined): string {
  if (value === undefined) return "";
  const rendered = typeof value === "number" ? String(value) : escapeAttr(value);
  return ` ${name}="${rendered}"`;
}

function failed(testCase: JUnitTestCase): boolean {
  return (testCase.failures?.length ?? 0) > 0;
}

function renderCase(testCase: JUnitTestCase): string {
  const open =
    `    <testcase` +
    attr("name", testCase.name) +
    attr("classname", testCase.classname) +
    attr("time", testCase.time);

  const children: string[] = [];
  if (testCase.skipped && !failed(testCase)) {
    children.push(`      <skipped/>`);
  }
  for (const failure of testCase.failures ?? []) {
    const tag = `      <failure` + attr("message", failure.message) + attr("type", failure.type);
    if (failure.details) {
      children.push(`${tag}>${escapeText(failure.details)}</failure>`);
    } else {
      children.push(`${tag}/>`);
    }
  }
  if (testCase.systemOut) {
    children.push(`      <system-out>${escapeText(testCase.systemOut)}</system-out>`);
  }

  if (children.length === 0) {
    return `${open}/>`;
  }
  return `${open}>\n${children.join("\n")}\n    </testcase>`;
}

function renderSuite(suite: JUnitTestSuite): string {
  const tests = suite.cases.length;
  const failures = suite.cases.filter(failed).length;
  const skipped = suite.cases.filter((c) => c.skipped && !failed(c)).length;

  const open =
    `  <testsuite` +
    attr("name", suite.name) +
    attr("tests", tests) +
    attr("failures", failures) +
    attr("errors", 0) +
    attr("skipped", skipped) +
    attr("timestamp", suite.timestamp);

  if (tests === 0) {
    return `${open}/>`;
  }
  return `${open}>\n${suite.cases.map(renderCase).join("\n")}\n  </testsuite>`;
}

export function buildJUnitXml(
  suites: JUnitTestSuite[],
  options: { name?: string } = {},
): string {
  const tests = suites.reduce((n, s) => n + s.cases.length, 0);
  const failures = suites.reduce((n, s) => n + s.cases.filter(failed).length, 0);

  const open =
    `<testsuites` +
    attr("name", options.name ?? "ohana") +
    attr("tests", tests) +
    attr("failures", failures) +
    attr("errors", 0);

  const body = suites.map(renderSuite).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${open}>\n${body}\n</testsuites>\n`;
}
