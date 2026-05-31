# AGENTS.md

Guidance for coding agents (Codex, and compatible tools) working in this repository.
This is the standalone `ohana` repo: **CI tooling for Salesforce Agent Script /
Agentforce DX** — it lints and simulates `.agent` files locally and in GitHub Actions,
with no Salesforce org required.

## Setup, build, test

Node.js 22+ and `pnpm@10`. Run everything from the repo root.

```bash
pnpm install
pnpm ensure:agentscript   # provisions the Agent Script toolchain (see below) — required
pnpm build                # pnpm -r, topological order
pnpm test                 # vitest in every package
pnpm typecheck            # tsc --noEmit across packages
pnpm check:example        # end-to-end smoke test against examples/testdrive-ci
```

Run a single test: `cd` into the package, then `pnpm vitest run src/index.test.ts`
or `pnpm vitest run -t "test name"`.

**Before opening a PR, all of these must pass:** `pnpm build`, `pnpm test`,
`pnpm typecheck`, `pnpm check:example`.

## The agentscript dependency (read this first)

`@agentscript/agentforce` is **not on npm**. Ohana loads it at runtime from a local
build, and a missing build fails at *runtime*, not build time. `pnpm ensure:agentscript`
provisions it: it reuses a sibling `sf-repos/agentscript` checkout or a prebuilt
`OHANA_AGENTSCRIPT_ENTRY` if present, otherwise it clones and builds
`salesforce/agentscript` into a gitignored `.agentscript/` cache. Pin the build with
`OHANA_AGENTSCRIPT_REF`. Runtime resolution lives in
`packages/core/src/agentscript.ts` → `resolveAgentScriptEntry`.

## Architecture

Four packages, strict dependency direction `core ← lint / sim ← cli` (workspace deps):

- **`@ohana/core`** — the only package that touches the agentscript toolchain. Loads
  `compileSource`, maps LSP-style diagnostics (0-based, numeric severity) to ohana's
  `AgentDiagnostic` (1-based, named), and exposes `findNode`/`findAction` over the
  compiled `AgentIr`. Also `config.ts`: discovers/loads `.ohana/config.yaml` with a
  hand-rolled minimal YAML parser (no YAML dependency — keep the supported subset).
- **`@ohana/lint`** — discovers `.agent` files (custom walk + glob→RegExp), compiles
  each via core, aggregates pass/fail.
- **`@ohana/sim`** — offline scenario runner: compile agent → route to subagent → find
  action → resolve fixture mocks → assert `expect.outputs` → emit a structured trace.
  Fully offline; outputs are fixture-driven, never network calls.
- **`@ohana/cli`** — arg parsing + `lint`/`sim`/`check` commands. `check` = lint then
  sim. Exit codes: `0` ok, `1` failures, `2` no `.agent` files / scenarios found.

## Conventions

- ESM only, `NodeNext` resolution — **import sibling files with explicit `.js`
  extensions** in `.ts` sources (e.g. `import { simCommand } from "./sim.js"`).
- TypeScript `strict` is on. Tests are vitest, colocated as `src/**/*.test.ts`.
- Keep changes minimal and matched to surrounding style. Update `CHANGELOG.md` under
  "Unreleased" for user-facing changes.
- Do not commit secrets. Do not commit the `.agentscript/` cache or `dist/`.
