# Changelog

All notable changes to Ohana are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Standalone build support: `pnpm ensure:agentscript` now clones and builds
  `salesforce/agentscript` into a repo-local `.agentscript/` cache when no
  sibling checkout or prebuilt entry is available. Pin with `OHANA_AGENTSCRIPT_REF`.
- GitHub Action input `agentscript-ref` to pin the toolchain build, and `format`
  to select text/JSON output.
- Community health files: Code of Conduct, Security Policy, issue/PR templates,
  Dependabot config.
- Codex-in-CI: Codex PR review, issue-triage, and maintainer-triggered autofix
  workflows, project `AGENTS.md`, and a project-specific review prompt.

## [0.2.0]

### Added

- `ohana sim` — offline scenario runner with fixture mocks.
- `ohana check` — lint + sim, the recommended CI entry point.
- `.ohana/config.yaml` support.

## [0.1.0]

### Added

- `ohana lint` — parse, lint, and compile all `.agent` files.
