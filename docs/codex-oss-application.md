# Codex for Open Source — application draft

Draft answers for the application at <https://openai.com/form/codex-for-oss/>.
The program reviews **case by case** and explicitly invites projects that "play an
important ecosystem role" even if they "don't meet every criterion" — so this draft
leans on **ecosystem role** and **active maintenance** rather than a star count.

> ⚠️ Honesty note: ohana is early and below the commonly-cited ~1,000-star bar. Do **not**
> overstate adoption. Apply once the repo is public and has a visible maintenance track
> record (see [PUBLIC_RELEASE_CHECKLIST.md](../PUBLIC_RELEASE_CHECKLIST.md)). The
> strongest, truthful angle is the *gap* ohana fills and the *Codex-in-CI* integration.
> The Fund (API-credits) track has a lower bar than the ChatGPT Pro track — lead with it.

Fill the bracketed fields before submitting.

---

**Applicant / maintainer:** Vinesh Shampoor — `[GitHub handle]`
**Email:** vinesh.shampoor@blue5green.com
**Role on the project:** Creator and core maintainer (write access / repo owner)
**Project:** Ohana — CI tooling for Salesforce Agent Script / Agentforce DX
**Repository:** `https://github.com/svineshreddy97-max/ohana` (public, Apache-2.0)
**License:** Apache-2.0

---

## What does the project do, and why does it matter to the ecosystem?

Salesforce has open-sourced the Agent Script **toolchain** (parser, language server,
compiler) but the **Agentforce runtime stays closed**. That leaves teams writing
`.agent` agent definitions with no way to lint, simulate, or regression-test them in CI
without a live org — a real gap for everyone shipping on Agentforce.

Ohana fills it: `ohana lint`, `ohana sim`, and `ohana check` parse, compile, and run
offline scenario simulations of `.agent` files — no org required — and ship as a GitHub
Action teams drop into PR checks. It's the "Vitest + reference checker" layer for a
language whose production runtime is proprietary. That positions ohana as connective
infrastructure for the Salesforce/Agentforce developer ecosystem rather than just
another app.

## How is it maintained, and how active is it?

- Public repo with CI (build + test + example check on every PR), Dependabot, issue and
  PR templates, a Code of Conduct, and a security policy with private vulnerability
  reporting.
- `[N]` releases following SemVer with a maintained `CHANGELOG.md`; current `v0.2.0`.
- Active issue triage and PR review `[link to issues/PRs]`.
- Roadmap published in the README (npm publish, SARIF security rules, trace export).

## How do you use — or plan to use — Codex in the project?

Already integrated (see [docs/codex-integration.md](codex-integration.md)):

- **Automated PR review** via `openai/codex-action@v1` against an ohana-specific review
  checklist (`.codex/prompts/agent-review.md`) — catches regressions in the
  diagnostic-severity mapping, the agentscript module boundary, ESM import rules, and the
  dependency-free config parser.
- **Issue triage** — Codex posts a summary, likely-affected area, ohana-vs-upstream
  scope, and suggested labels on new issues.
- **Day-to-day maintenance** — using Codex/ChatGPT Pro for the toolchain bridge work,
  new lint rules, and the offline simulator.

Planned: Codex autofix for failing `ohana check` runs, and release-notes drafting into
the changelog. These directly match the Fund's intent — Codex wired into PR review,
maintenance automation, and releases.

## Which track(s) are you applying for?

- **Codex Open Source Fund (API credits)** — primary; powers the PR-review/triage
  workflows above.
- **6 months ChatGPT Pro with Codex** — for maintainer coding/review/triage.
- **Codex Security** — optional/conditional; relevant once the planned SARIF security
  rules land (analyzing untrusted `.agent`/scenario inputs).

## Anything else? (the "doesn't fit every criterion" box)

Ohana is young and below typical star thresholds, but it occupies a clear structural gap
the Salesforce ecosystem leaves open (closed runtime, no offline CI for Agent Script),
it is already publicly maintained with real CI, and it already uses Codex in its own
maintenance loop. Fund support would accelerate the PR-review/autofix automation that
makes a small-maintainer OSS infra project sustainable.

---

## Links to include

- Repo: `https://github.com/svineshreddy97-max/ohana`
- README quick start, Action usage, roadmap
- `docs/codex-integration.md` (Codex usage)
- Background research: the Salesforce Agent Script ecosystem analysis this project came from
- `CHANGELOG.md`, open issues/PRs (maintenance evidence)
