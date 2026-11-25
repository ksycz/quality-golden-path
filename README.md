# quality-golden-path

A small, public demo of a **quality golden path for teams where coding agents write much of the code**.

> Prove it before release. Confirm it in production.

The domain is synthetic: a payment service's **daily transfer limit**. Nothing here comes from any real company, and all data is made up.

**Dashboard:** https://ksycz.github.io/quality-golden-path/: the four headline metrics on synthetic data, one of them getting worse on purpose. Build it locally with `npm run dashboard`.

## What's here

| Path | What it is |
|---|---|
| `requirements/daily-transfer-limit.md` | The requirement: the source of truth for every test |
| `risks.yml` | The risk list. Tests name the risk they prove |
| `src/transfer-limit.ts` | `decideTransfer()`: approve or reject a transfer |
| `tests/` | Example tests from the requirement, plus property-based tests |
| `AGENTS.md` | **The Guide**: the rules every coding agent (and person) follows here |
| `CLAUDE.md` | Imports `AGENTS.md`, plus Claude Code specifics. One Guide, many agents |
| `.claude/skills/writing-tests/` | A skill: how to write a test from the requirement, with a bad and a good example |
| `.github/pull_request_template.md` | Requirement, risks touched and test intent for Tier 1; "How to test locally" on every PR |

## Commands

Run once after cloning:

```bash
nvm use     # switch to Node 22 (version in .nvmrc)
npm ci      # install exactly the versions in package-lock.json
```

| Command | What it does | Time |
|---|---|---|
| `npm test` | Runs the example and property-based tests once | ~1 s |
| `npm run test:watch` | Re-runs the tests every time you save a file | |
| `npm start` | Starts the transfer page on http://127.0.0.1:4310/ (add `?customer=ana` to be another customer) and its API: `GET /health`, `POST /transfers/decision`, `POST /transfers`, `GET /transfers/today` | |
| `npm run smoke` | Smoke tests: Playwright starts the real server and calls it. No browser needed | ~1 s |
| `npm run e2e` | End-to-end tests: Playwright drives the transfer page in Chromium through a customer's day. Shows SKIP if Chromium isn't installed (`npx playwright install chromium`); CI always runs them | ~5 s |
| `npm run typecheck` | Checks TypeScript types without building anything | ~1 s |
| `npm run lint` | ESLint: likely bugs and unused code | ~1 s |
| `npm run check:risks` | Fails if a risk in `risks.yml` has no test naming it | <1 s |
| `npm run check:names` | Fails if a word from the hashed deny list appears in any file | <1 s |
| `npm run check:data` | Fails on real-looking card numbers or IBANs | <1 s |
| `npm run check:secrets` | Runs gitleaks for tokens, keys and passwords before you push. Shows SKIP if gitleaks isn't installed (`brew install gitleaks`); CI always scans | <1 s |
| `npm run check:size` | Counts changed lines against `origin/main`: warns above 400, fails above 1,000 unless the PR says why. Moves, lockfiles and reports don't count | <1 s |
| `npm run check:title -- "feat: x"` | Checks a PR title against Conventional Commits | <1 s |
| `npm run check:description -- body.md` | Checks a PR description against the PR template | <1 s |
| `npm run mutation` | Mutation testing on all code; report in `reports/mutation/index.html` | ~5 s here |
| `npm run mutation:changed` | Mutation testing only on `src/` files changed vs `origin/main`, including uncommitted and new files. This is what `gates` and CI run | varies |
| `npm run risk-coverage` | Tier 1 Risk Coverage from a full mutation run: per risk in `risks.yml`, the mutants in the code its tests run and how many the suite catches. A risk counts at 80% or more. Not a gate; the dashboard's numbers stay synthetic | ~25 s |
| `npm run gates` | Everything above in order, the same checks CI runs, with one PASS/FAIL/SKIP report; on failure it shows only what broke | ~10 s here |

```bash
npm run gates                       # run every gate locally before opening a PR
open reports/mutation/index.html    # see which mutants the tests killed or missed (macOS)
```

## Quality gates in CI

`.github/workflows/quality.yml` runs on every pull request. It first decides from the **changed files** (never the PR title) whether the change is docs-only; docs-only changes run only the cheap checks. One final job, `gate`, is the single required check on `main`.

| Path | What it is |
|---|---|
| `quality.yml` | Declares the Risk Tier and gate thresholds; owned by the QA Guild |
| `scripts/` | The gate scripts, each with a header saying what it checks |
| `stryker.config.mjs` | Mutation testing settings, including the 80% threshold |
| `.github/CODEOWNERS` | Who must approve changes to the quality configuration |
| `.github/rulesets/main.json` | A reviewable copy of the team ruleset for `main` |
| `.github/name-guard.sha256` | Hashes of words that must never appear in this repo |

This repo is being built in small pull requests; the README grows with each one. [`ROADMAP.md`](ROADMAP.md) lists what is done, what comes next and what is left out on purpose.
