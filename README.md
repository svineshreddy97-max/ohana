# Ohana

[![CI](https://github.com/ohana-dev/ohana/actions/workflows/ci.yml/badge.svg)](https://github.com/ohana-dev/ohana/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**CI tooling for Salesforce Agent Script and Agentforce DX.**

Ohana lints and simulates `.agent` files locally and in GitHub Actions — no org required for the first checks.

```bash
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

### `ohana lint`

Parse, lint, and compile all `.agent` files under the project root (or `--path`).

```bash
ohana lint --path force-app --format json --fail-on-warning
```

### `ohana sim`

Run offline scenarios from `scenarios/*.json` with fixture mocks from `fixtures/`.

```bash
ohana sim --path examples/testdrive-ci
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

### `ohana check`

Runs `lint` then `sim` — recommended CI entry point.

## Configuration

Optional `.ohana/config.yaml`:

```yaml
version: 1
lint:
  path: force-app
  fail_on_warning: false
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
- [ ] v0.3 — npm publish when `@agentscript/agentforce` is public
- [ ] v0.4 — eval YAML + SARIF security rules
- [ ] v0.5 — `.as-trace` export

## Related

- [Research docs](../docs/salesforce-agent-opportunity/)
- [salesforce/agentscript](https://github.com/salesforce/agentscript)

## License

Apache-2.0
