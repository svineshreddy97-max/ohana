# Changelog

All notable changes to Ohana are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CLI argument parsing extracted into `@ohana/cli/args` with unit-test coverage
  (`parseArgs`, `sharedOptions`, `getVersion`).
- `ohana --version` / `ohana -v` prints the CLI version.
- `ohana sim` now fails with a clear error when two scenarios share an `id`,
  instead of silently double-counting them.
- `ohana sim --filter <id>` runs only scenarios whose id contains the given
  case-insensitive substring — handy for iterating on one scenario locally.
- Config YAML parser now understands block sequences and flow arrays, so
  `lint.globs` (and other list options) can be set in `.ohana/config.yaml`
  rather than only via CLI flags.

- `ohana lint --format sarif` — emits a SARIF 2.1.0 log for GitHub code scanning, so
  diagnostics surface as inline PR annotations.
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
