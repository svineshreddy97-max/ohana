# Changelog

All notable changes to Ohana are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-06-01

### Added

- Ohana semantic lint rules on top of Agent Script compiler diagnostics:
  `ohana/no-missing-description`, `ohana/naming-convention` (off by default),
  `ohana/dangling-transition`, `ohana/unreachable-subagent`,
  `ohana/missing-action-target`, `ohana/no-unused-action`, and
  `ohana/duplicate-developer-name`. Rules run only when compilation succeeds;
  disable them with `--no-rules` or per-rule via `lint.rules` in
  `.ohana/config.yaml`.
- `--format junit` for `lint` and `sim` — emits JUnit XML (one testcase per
  `.agent` file or scenario) for CI test reporters such as dorny/test-reporter.
- `--no-rules` on `lint` and `check` — compiler diagnostics only.
- `lint.rules` in `.ohana/config.yaml` — per-rule severity overrides
  (`off` / `warn` / `error`, or `0` / `1` / `2`).

### Changed

- SARIF rule ids now use the `ohana/<name>` convention (was `ohana.name`);
  each result carries a `ruleIndex`, and built-in rule descriptions are
  included in the SARIF rule catalog.
- Expanded Agent IR types in `@ohana/core` for semantic rules (action inputs,
  tools with state updates, routing transitions).

## [0.3.0] - 2026-05-31

### Added

- CLI argument parsing extracted into `@ohana/cli/args` with unit-test coverage
  (`parseArgs`, `sharedOptions`, `getVersion`).
- `ohana --version` / `ohana -v` prints the CLI version.
- `--out <file>` for `lint` and `sim` writes the report to a file (creating
  parent dirs) instead of stdout — e.g. `lint --format sarif --out ohana.sarif`.
- `ohana init` scaffolds `.ohana/config.yaml`, `scenarios/`, and `fixtures/`
  for a new project. Idempotent — never overwrites existing files.
- Colorized text reports on a TTY (pass/fail summary, ✓/✗ marks, severity
  labels). Honors `--no-color` and the `NO_COLOR` convention, and stays plain
  for non-TTY, `--out`, and machine formats.
- `ohana sim` now fails with a clear error when two scenarios share an `id`,
  instead of silently double-counting them.
- `ohana sim --filter <id>` runs only scenarios whose id contains the given
  case-insensitive substring — handy for iterating on one scenario locally.
- Config YAML parser now understands block sequences and flow arrays, so
  `lint.globs` (and other list options) can be set in `.ohana/config.yaml`
  rather than only via CLI flags.
- `lint.ignore` in `.ohana/config.yaml` — extra directory names to skip during
  `.agent` discovery, on top of the built-in defaults (`node_modules`, `.git`,
  `dist`, `.ohana`).
- `ohana lint --format sarif` — emits a SARIF 2.1.0 log for GitHub code scanning, so
  diagnostics surface as inline PR annotations.
- `ohana lint --format github` — emits GitHub Actions workflow-command
  annotations (`::error file=…,line=…::msg`), surfacing diagnostics inline on
  the PR with no SARIF upload step. Message/property escaping per the spec.
- Standalone build support: `pnpm ensure:agentscript` now clones and builds
  `salesforce/agentscript` into a repo-local `.agentscript/` cache when no
  sibling checkout or prebuilt entry is available. Pin with `OHANA_AGENTSCRIPT_REF`.
- GitHub Action input `agentscript-ref` to pin the toolchain build, and `format`
  to select text/JSON output.
- Community health files: Code of Conduct, Security Policy, issue/PR templates,
  Dependabot config.
- Codex-in-CI: Codex PR review, issue-triage, and maintainer-triggered autofix
  workflows, project `AGENTS.md`, and a project-specific review prompt.
- Self-contained example/tests: vendored the AFDX `Local_Info_Agent.agent` into
  `examples/testdrive-ci/agents/` (Apache-2.0, attributed in `NOTICE`) and repointed the
  lint/sim tests and example config at it, so `pnpm test` and `check:example` pass on a
  fresh clone with no sibling repos.

### Fixed

- Lint diagnostics are now sorted by line then column within each file, so
  text and SARIF output are deterministic regardless of compiler emit order.
- `ohana sim` no longer crashes on `.yaml`/`.yml` scenario files. Scenario
  discovery already matched them, but the loader only ran `JSON.parse`; YAML
  scenarios are now parsed with the config YAML subset.
- Fixture input matching and `expect.outputs` assertions now compare values
  structurally (deep equality), so object- and array-valued action inputs and
  outputs match instead of always failing strict `===`.

### Changed

- CI workflow rewritten for the standalone repo layout (no `ohana/` working-directory or
  path filters; added a typecheck step).

## [0.2.0]

### Added

- `ohana sim` — offline scenario runner with fixture mocks.
- `ohana check` — lint + sim, the recommended CI entry point.
- `.ohana/config.yaml` support.

## [0.1.0]

### Added

- `ohana lint` — parse, lint, and compile all `.agent` files.
