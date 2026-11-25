# quality-golden-path

A small, public demo of a **quality golden path for teams where coding agents write much of the code**.

> Prove it before release. Confirm it in production.

The domain is synthetic: a payment service's **daily transfer limit**. Nothing here comes from any real company, and all data is made up.

**Dashboard:** https://ksycz.github.io/quality-golden-path/: the four headline metrics on synthetic data, one of them getting worse on purpose. Build it locally with `npm run dashboard`.

## Start here: the demo

[Pull request 9](https://github.com/ksycz/quality-golden-path/pull/9) is the demo. A coding agent added a rule, "a single transfer may be at most €2,000.00", wrote `<` where the rule needs `<=`, and wrote tests that check what its code does. It stays open on purpose, labelled "do not merge".

1. **The merge panel:** every test passes and every new line runs, yet `gate · can this PR merge?` is required and red.
2. **The run's Summary page:** mutation testing on the changed code scores 75% against a bar of 80%, and lists the surviving mutants. The one on line 13 (`<` changed to `<=`) is the real bug: a transfer of exactly €2,000.00 is rejected.
3. **Try the fix yourself** in a copy, so pull request 9 stays red:

   ```bash
   git fetch origin
   git worktree add ../demo-fix origin/feat/single-transfer-max
   cd ../demo-fix && npm ci
   ```

   Ask your coding agent: *"Fix the failing gate, follow AGENTS.md."* The Guide sends it to the requirement's examples, so it should test €2,000.00 and €2,000.01, watch the first one fail, and change `<` to `<=`. `npm run gates` tells you whether it did.

## How this maps to the strategy

| Idea | In this repo |
|---|---|
| **Guide**: what agents read | `AGENTS.md`, `CLAUDE.md` and `.claude/skills/writing-tests/` |
| **Gate**: what CI enforces | `.github/workflows/quality.yml`, configured by `quality.yml`, with one required check, `gate` |
| **Golden Path**: where a team starts | The repo as a whole: clone it, and the Guide and the Gates already work |
| **Risk Tier 1**: money, identity, access | Declared in `quality.yml`; the risks are listed in `risks.yml` |
| **Risk Coverage**: are the listed risks protected by tests that catch mutants? | `npm run risk-coverage` |

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
| `smoke/`, `e2e/` | Playwright: API smoke tests against the running service, and a customer's day on the transfer page in Chromium |
| `dashboard/` | Builds the dashboard page from synthetic data in `dashboard/data.json` |
| `ROADMAP.md` | What is done, what comes next and what is left out on purpose |

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

| Job | What it checks |
|---|---|
| Which gates apply | Code or docs-only, from the changed files |
| Cheap checks | PR title and description, names, size, secrets. Runs on every PR, docs included |
| Stage 1 · Fast | Lint, types, example and property-based tests, every risk has a test, no real payment data |
| Stage 2 · Evidence | Mutation testing on changed code; Tier 1 needs 80% |
| Stage 3 · Smoke | The real service starts and answers |
| Stage 4 · End to end | A customer's day on the transfer page |
| `gate · can this PR merge?` | Passes only when every stage that applies has passed |

Stages 2 to 4 run in parallel after Stage 1. A full run takes about a minute.

| Path | What it is |
|---|---|
| `quality.yml` | Declares the Risk Tier and gate thresholds; owned by the QA Guild |
| `scripts/` | The gate scripts, each with a header saying what it checks |
| `stryker.config.mjs` | Mutation testing settings, including the 80% threshold |
| `.github/CODEOWNERS` | Who must approve changes to the quality configuration |
| `.github/rulesets/main.json` | A reviewable copy of the team ruleset for `main` |
| `.github/name-guard.sha256` | Hashes of words that must never appear in this repo |

## Built here, and only described

**Built and running:** the Guide, every gate above, branch protection on `main`, the demo PR, the transfer page and its API, the dashboard and Risk Coverage from a real mutation run.

**Described in the strategy, not built here:** the same Playwright journeys running against production on a schedule, with results in Prometheus and alerts in Grafana; nightly runs (here `npm run risk-coverage` runs by hand); the AI Advisor; canary releases; contract tests; tiering per change. The dashboard's numbers are synthetic.

[`ROADMAP.md`](ROADMAP.md) lists what is done, what comes next and what is left out on purpose.
