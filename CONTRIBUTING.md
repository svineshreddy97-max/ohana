# Contributing to Ohana

## Setup

```powershell
cd ohana
pnpm install
pnpm ensure:agentscript
pnpm build
pnpm test
```

Requires Node.js 22+ and a built copy of [salesforce/agentscript](https://github.com/salesforce/agentscript) at `../sf-repos/agentscript` (or set `OHANA_AGENTSCRIPT_ENTRY`).

## Project structure

```
packages/
  core/     Shared agentscript bridge + config
  lint/     .agent discovery and compile checks
  sim/      Offline scenario + fixture runner
  cli/      ohana command
examples/
  testdrive-ci/   Golden example against AFDX testdrive
action/           GitHub composite action
```

## Adding a scenario

1. Add fixture JSON under `fixtures/`
2. Add scenario JSON under `scenarios/`
3. Run `ohana sim --path your-project`

## Tests

```powershell
pnpm test
pnpm check:example
```

## License

Apache-2.0 — contributions welcome via pull request.
