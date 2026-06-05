# Ohana

[![CI](https://github.com/svineshreddy97-max/ohana/actions/workflows/ci.yml/badge.svg)](https://github.com/svineshreddy97-max/ohana/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**CI tooling for Salesforce Agent Script and Agentforce DX.**

Ohana lints and simulates `.agent` files locally and in GitHub Actions — no org required for the first checks.

```bash
ohana init       # scaffold a project
ohana lint
ohana sim
ohana check      # lint + sim
ohana rules      # list available lint rules
ohana coverage   # show scenario coverage
ohana validate   # check config for errors
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

**Ohana semantic rules.** On top of Agent Script compiler diagnostics, Ohana runs
graph-level checks (missing descriptions, dangling transitions, unreachable
subagents, unused actions, and more). Configure per-rule severity in
`.ohana/config.yaml` or pass `--no-rules` to skip them:

```bash
ohana lint --path force-app --no-rules          # compiler only
ohana lint --path force-app --fail-on-warning   # warnings fail CI too
```

Rule ids follow the `ohana/<name>` convention (e.g. `ohana/no-missing-description`).
See `lint.rules` in the configuration section below.

**SARIF for code scanning.** Emit [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
and upload it:

```yaml
# In a workflow, after building ohana:
- run: node packages/cli/dist/bin/ohana.js lint --path force-app --format sarif --out ohana.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: ohana.sarif
```

**JUnit XML for CI test reporters.** `--format junit` on `lint` or `sim` emits
JUnit XML that tools like [dorny/test-reporter](https://github.com/dorny/test-reporter)
consume — one testcase per `.agent` file or scenario:

```bash
ohana lint --path force-app --format junit --out ohana-lint.xml
ohana sim --path . --format junit --out ohana-sim.xml
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

### `ohana rules`

List all available Ohana semantic lint rules with their id, effective
severity, and description. Respects `lint.rules` overrides from
`.ohana/config.yaml`.

```bash
ohana rules --path .            # text output
ohana rules --format json       # machine-readable list
```

### `ohana coverage`

Show which agent actions have scenario test coverage and which are
untested. Compiles `.agent` files and cross-references them against
scenario definitions.

```bash
ohana coverage --path examples/testdrive-ci
ohana coverage --format json    # machine-readable coverage data
```

### `ohana validate`

Check `.ohana/config.yaml` for errors: unknown keys, invalid types,
bad rule severities, and missing referenced paths. On success, prints the
resolved config.

```bash
ohana validate --path .
ohana validate --format json
```

## Options

| Flag | Commands | Description |
|------|----------|-------------|
| `--path <dir>` | all | Project root (default: cwd or nearest `.ohana/config.yaml`) |
| `--format <text\|json\|sarif\|github\|junit>` | lint, sim, check | Output format (default `text`). `sarif`/`github` are lint-only |
| `--fail-on-warning` | lint, check | Exit non-zero on warnings |
| `--no-rules` | lint, check | Disable Ohana semantic lint rules (compiler diagnostics only) |
| `--filter <id>` | sim | Run only scenarios whose id contains this substring |
| `--out <file>` | lint, sim | Write the report to a file (creating parent dirs) instead of stdout |
| `--quiet` | lint, sim, check | Only show failures in text output |
| `--watch` | lint, sim, check | Re-run on file changes (`.agent`, `.json`, `.yaml`) |
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
  rules:           # per-rule severity: off | warn | error (0 | 1 | 2)
    "ohana/naming-convention": warn
    "ohana/no-unused-action": off
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
- [x] v0.4 — Ohana semantic lint rules, `--format junit`, `--no-rules`,
  `lint.rules` config
- [x] v0.5 — `ohana rules`, `ohana coverage`, `ohana validate`,
  `--quiet`, `--watch`, elapsed timing, sim summary stats
- [ ] npm publish when `@agentscript/agentforce` is public
- [ ] `.as-trace` export

## Related

- [Research docs](../docs/salesforce-agent-opportunity/)
- [salesforce/agentscript](https://github.com/salesforce/agentscript)

## License

Apache-2.0
