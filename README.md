# Ohana

[![CI](https://github.com/svineshreddy97-max/ohana/actions/workflows/ci.yml/badge.svg)](https://github.com/svineshreddy97-max/ohana/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**CI tooling for Salesforce Agent Script and Agentforce DX.**

Ohana lints and simulates `.agent` files locally and in GitHub Actions — no org required for the first checks.

```bash
ohana init     # scaffold a project
ohana lint
ohana sim
ohana check    # lint + sim
```

## Quick start

```powershell
cd ohana
pnpm install
pnpm ensure:agentscript
pnpm build
pnpm test
pnpm check:example
```

## Commands

### `ohana init`

Scaffold `.ohana/config.yaml` plus `scenarios/` and `fixtures/` for a new
project. Idempotent — it never overwrites existing files.

```bash
ohana init --path .
```

### `ohana lint`

Parse, lint, and compile all `.agent` files under the project root (or `--path`).

```bash
ohana lint --path force-app --format json --fail-on-warning
```

**Inline PR annotations — no upload step.** `--format github` emits GitHub
Actions workflow commands, so diagnostics appear directly on the PR:

```bash
ohana lint --path force-app --format github
```

**SARIF for code scanning.** Emit [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
and upload it:

```yaml
# In a workflow, after building ohana:
- run: node packages/cli/dist/bin/ohana.js lint --path force-app --format sarif --out ohana.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: ohana.sarif
```

### `ohana sim`

Run offline scenarios from `scenarios/*.json` (or `*.yaml`) with fixture mocks
from `fixtures/`. Use `--filter <id>` to run a single scenario by id substring.

```bash
ohana sim --path examples/testdrive-ci --filter weather
```

Scenario format (JSON):

```json
{
  "id": "weather-apex",
  "agent": "path/to/Agent.agent",
  "utterance": "What's the weather like today?",
  "subagent": "local_weather",
  "action": {
    "name": "check_weather",
    "target": "CheckWeather",
    "inputs": { "dateToCheck": "2026-05-30" }
  },
  "fixture": "fixtures/CheckWeather.json"
}
```

The same scenario in YAML is also supported. Fixture mocks are matched by input
values (with structural/deep equality), falling back to a `{ "default": true }`
mock.

### `ohana check`

Runs `lint` then `sim` — recommended CI entry point.

## Options

| Flag | Commands | Description |
|------|----------|-------------|
| `--path <dir>` | all | Project root (default: cwd or nearest `.ohana/config.yaml`) |
| `--format <text\|json\|sarif\|github>` | lint, check | Output format (default `text`). `sarif`/`github` are lint-only |
| `--fail-on-warning` | lint, check | Exit non-zero on warnings |
| `--filter <id>` | sim | Run only scenarios whose id contains this substring |
| `--out <file>` | lint, sim | Write the report to a file (creating parent dirs) instead of stdout |
| `--no-color` | all | Disable ANSI color (also honors `NO_COLOR`) |
| `--agentscript <path>` | all | Path to `@agentscript/agentforce` `dist/index.js` |
| `--skip-sim` | check | Run lint only |
| `--version`, `-v` | — | Print the ohana version |

Exit codes: `0` ok, `1` failures, `2` no `.agent` files / scenarios found.

## Configuration

Optional `.ohana/config.yaml` (CLI flags override it):

```yaml
version: 1
lint:
  path: force-app
  fail_on_warning: false
  globs:
    - "**/*.agent"
    - "**/aiAuthoringBundles/**/*.agent"
  ignore:          # extra dirs to skip (on top of node_modules/.git/dist/.ohana)
    - vendor
sim:
  fixtures: fixtures
  scenarios: scenarios
```

## Example project

See [examples/testdrive-ci/](examples/testdrive-ci/) — lints and simulates the official [AFDX testdrive](https://github.com/forcedotcom/afdx-pro-code-testdrive) agent.

## GitHub Actions

```yaml
- uses: ./ohana/action
  with:
    path: .
    mode: check
```

Or copy [examples/github-workflow.yml](examples/github-workflow.yml).

## Packages

| Package | Description |
|---------|-------------|
| `@ohana/core` | Agent Script bridge + config loader |
| `@ohana/lint` | Discover and lint `.agent` files |
| `@ohana/sim` | Offline scenario runner with fixtures |
| `@ohana/cli` | `ohana` CLI |

## Agent Script dependency

`@agentscript/agentforce` is not on npm yet. Ohana uses a local build:

```powershell
pnpm ensure:agentscript
# or
$env:OHANA_AGENTSCRIPT_ENTRY = "C:\path\to\agentscript\packages\agentforce\dist\index.js"
```

## Roadmap

- [x] v0.1 — `ohana lint`
- [x] v0.2 — `ohana sim`, `ohana check`, `.ohana/config.yaml`
- [x] v0.3 — `ohana init`, SARIF + GitHub annotations, `--filter`/`--out`,
  colorized output, YAML scenarios, config list options
- [ ] npm publish when `@agentscript/agentforce` is public
- [ ] ohana-specific lint rules (naming, required descriptions, unused tools)
- [ ] `.as-trace` export

## Related

- [Research docs](../docs/salesforce-agent-opportunity/)
- [salesforce/agentscript](https://github.com/salesforce/agentscript)

## License

Apache-2.0
