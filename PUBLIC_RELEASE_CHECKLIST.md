# Public release checklist

Goal: get `ohana` onto public GitHub as a credible, actively-maintained OSS project,
and list the Action on the GitHub Marketplace. The "active maintenance" clock that the
**Codex for Open Source** program reviews only starts once this is public — so do this early.

> Replace `ohana-dev` below with the real org/user once chosen. The repo URLs in the
> README badges, `dependabot.yml`, and issue-template `config.yml` use `ohana-dev/ohana`.

## 1. Extract `ohana/` into its own repository

The Action and CI assume `ohana` is the **repository root** (so `action.yml` resolves
the repo root as `github.action_path/..`). Today `ohana/` is a subdirectory of the
`opsrc` research workspace; publish it as a standalone repo.

```powershell
# From a clean copy of the ohana directory (NOT the opsrc parent):
cd C:\Users\VineshShampoor\opsrc\ohana
git init -b main
git add .
git commit -m "Initial public release: ohana v0.2.0"
gh repo create ohana-dev/ohana --public --source=. --remote=origin --push
```

Verify the standalone build works with **no sibling `sf-repos/agentscript`** (this is
what external users and CI will hit):

```powershell
$env:OHANA_AGENTSCRIPT_REF = "<pin-a-tag-or-sha>"   # reproducible builds
pnpm install
pnpm ensure:agentscript    # clones + builds salesforce/agentscript into .agentscript/
pnpm build
pnpm test
pnpm check:example
```

## 2. Files in this repo (done)

- [x] `LICENSE` (Apache-2.0)
- [x] `README.md` with badges + quick start
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md`
- [x] `SECURITY.md` (private vulnerability reporting)
- [x] `CHANGELOG.md` (Keep a Changelog format)
- [x] `.github/ISSUE_TEMPLATE/` (bug + feature forms, config)
- [x] `.github/PULL_REQUEST_TEMPLATE.md`
- [x] `.github/dependabot.yml`
- [x] `.github/workflows/ci.yml`
- [x] `action/action.yml` (composite, standalone-capable)

## 3. Repo settings to flip on GitHub

- [ ] Add a concise **description** and **topics**: `salesforce`, `agentforce`,
      `agent-script`, `ci`, `linter`, `github-action`, `devtools`.
- [ ] Enable **Discussions** (issue template `config.yml` links to it).
- [ ] Enable **Private vulnerability reporting** (Settings → Security).
- [ ] Branch protection on `main`: require CI to pass before merge.
- [ ] Add `OPENAI_API_KEY` repo secret (for the Codex workflows — see
      [docs/codex-integration.md](docs/codex-integration.md)).

## 4. Tag a release

```powershell
git tag v0.2.0
git push origin v0.2.0
gh release create v0.2.0 --title "ohana v0.2.0" --notes-file CHANGELOG.md
```

## 5. List the Action on the GitHub Marketplace

GitHub Marketplace requires the action metadata file at the **repository root**, but
ours lives at `action/action.yml` so it can coexist with the monorepo. Two supported
paths:

- **Recommended (after `@ohana/cli` is on npm, v0.3):** publish a thin companion repo
  `ohana-dev/ohana-action` whose root `action.yml` simply runs
  `npx @ohana/cli@<version> check`. Fast for consumers (no source build) and
  Marketplace-valid.
- **Now (pre-npm):** at release time, copy `action/action.yml` to the repo root on a
  release branch/tag and publish from there. Consumers reference
  `uses: ohana-dev/ohana@v0.2.0`. Slower (builds from source) but self-contained.

Then: repo home → "Publish this Action to the GitHub Marketplace" → pick categories
(*Continuous integration*, *Code quality*), accept the agreement, release.

Consumer usage (already provided in [examples/github-workflow.yml](examples/github-workflow.yml)):

```yaml
- uses: ohana-dev/ohana@v0.2.0   # or ./ohana/action within this repo
  with:
    path: force-app
    mode: check
    agentscript-ref: <pinned-sha>
```

## 6. Adoption signals to start accumulating (what the program reviews)

- [ ] Real dependents: open PRs adding the Action to 2–3 public Agentforce DX repos.
- [ ] Issue triage + release cadence (visible, ongoing — not a one-time dump).
- [ ] A short launch writeup / demo GIF in the README.
- [ ] Wire Codex into this repo's own PR review (see Step 2 deliverables) — this is
      both a maintenance-quality signal and the qualifier for the Fund track.
