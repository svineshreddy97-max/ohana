# Ohana PR review guidelines (for Codex)

You are reviewing a pull request to **ohana**, a TypeScript/pnpm monorepo that lints and
simulates Salesforce Agent Script (`.agent`) files. Read `AGENTS.md` for architecture and
conventions before reviewing.

Review **only the changes in this PR**. Be concise and specific — cite `file:line` and
prefer a few high-confidence findings over a long list. If the PR is clean, say so briefly.

## What to check, in priority order

1. **Correctness** — logic bugs, wrong exit codes (`0` ok / `1` failure / `2` nothing
   found), mishandled diagnostics severity mapping (LSP 0-based numeric → ohana 1-based
   named), broken fixture matching or scenario routing in `@ohana/sim`.
2. **The agentscript boundary** — only `@ohana/core` should import the agentscript
   toolchain. Flag new direct dependencies on `@agentscript/*` from `lint`/`sim`/`cli`.
   Flag anything that assumes a sibling `sf-repos/` path instead of using
   `resolveAgentScriptEntry` / `ensure:agentscript`.
3. **ESM correctness** — relative imports of local files must use explicit `.js`
   extensions. Flag missing extensions and any CommonJS-isms.
4. **Config parser** — changes to `parseSimpleYaml` must stay dependency-free and not
   silently broaden/break the supported YAML subset.
5. **Tests** — new behavior should have a colocated `*.test.ts`. Note missing coverage.
6. **Public API / docs** — new CLI flags or behavior changes should be reflected in
   `README.md`, the `action/action.yml` inputs, and `CHANGELOG.md` (Unreleased).

## How to verify

If the environment allows, run `pnpm build && pnpm test && pnpm typecheck` and, when
`.agent` files or sim logic changed, `pnpm check:example`. Report any failures with the
exact command and output. Do not modify files — this is a read-only review.
