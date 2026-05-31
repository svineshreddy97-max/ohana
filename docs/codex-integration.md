# Codex integration

Ohana uses [Codex](https://developers.openai.com/codex) in its own maintainer
workflows. This is intentional: the **Codex for Open Source** program's *Codex Open
Source Fund* (API-credits track) specifically supports projects that "integrate Codex
into PR review workflows, maintenance automation, releases, or other critical OSS
tasks." These integrations are that qualifier, and they genuinely reduce maintainer load.

## What's wired up

| Surface | File | What it does |
|---------|------|--------------|
| Project context for agents | [`AGENTS.md`](../AGENTS.md) | Codex reads this for build/test/architecture/conventions. |
| PR review | [`.github/workflows/codex-review.yml`](../.github/workflows/codex-review.yml) | On every PR, Codex reviews the diff against project-specific rules and posts a comment. |
| Review rules | [`.codex/prompts/agent-review.md`](../.codex/prompts/agent-review.md) | Ohana-specific review checklist (agentscript boundary, ESM `.js` imports, exit codes, config parser, tests). |
| Issue triage | [`.github/workflows/codex-triage.yml`](../.github/workflows/codex-triage.yml) | On new issues, Codex posts a summary, likely area, scope (ohana vs. upstream), and suggested labels. |
| Autofix | [`.github/workflows/codex-autofix.yml`](../.github/workflows/codex-autofix.yml) | Maintainer-triggered (manual dispatch or `/codex-fix <task>` comment). Codex makes the change on a fresh branch and opens a PR, which CI + the review workflow then validate. |

The review and triage workflows use the official
[`openai/codex-action@v1`](https://github.com/openai/codex-action) in `read-only` sandbox
mode (they never write to the repo) and post via a separate job with `issues: write` —
keeping the API key out of any job that runs PR-controlled code. The autofix workflow is
opt-in and `workspace-write`, gated to maintainer triggers, and never pushes to an
existing branch — it always opens a fresh PR for human review.

## Setup

1. Create an OpenAI API key (or use the Fund credits once granted).
2. Add it as a repository secret named `OPENAI_API_KEY`
   (Settings → Secrets and variables → Actions → New repository secret).
3. That's it. The workflows skip themselves cleanly when the secret is absent or the PR
   comes from a fork (forks can't read secrets).

## Notes and guardrails

- These are **assistants, not gates** — human review still merges. The PR comment says so.
- `read-only` sandbox on review/triage means Codex cannot modify files or push; it only
  reads the checkout and reports. The autofix flow is kept in its own `workspace-write`
  workflow that only maintainers can trigger and that opens a fresh PR — do not loosen the
  review/triage jobs to write mode.
- Model and sandbox are configurable via the action inputs (`model`, `sandbox`,
  `safety-strategy`); defaults are fine to start.

## Roadmap ideas (further Fund-track value)

- Auto-trigger the autofix workflow from failing `ohana check` CI runs.
- Release-notes drafting from merged PRs into `CHANGELOG.md`.
- A `.agent`-aware reviewer that runs `ohana sim` on changed scenarios and explains
  failing traces inline.
