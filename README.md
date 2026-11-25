# quality-golden-path

A small, public demo of a **quality golden path for teams where coding agents write much of the code**.

> Prove it before release. Confirm it in production.

The domain is synthetic: a bank's **daily transfer limit**. Nothing here comes from any real company, and all data is made up.

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
| `npm run typecheck` | Checks TypeScript types without building anything | ~1 s |
| `npm run lint` | ESLint: likely bugs and unused code | ~1 s |
| `npm run check:risks` | Fails if a risk in `risks.yml` has no test naming it | <1 s |
| `npm run check:names` | Fails if a word from the hashed deny list appears in any file | <1 s |
| `npm run check:data` | Fails on real-looking card numbers or IBANs | <1 s |
| `npm run check:title -- "feat: x"` | Checks a PR title against Conventional Commits | <1 s |
| `npm run mutation` | Mutation testing on all code; report in `reports/mutation/index.html` | ~5 s here |
| `npm run mutation:changed` | Mutation testing only on `src/` files changed vs `origin/main` | varies |
| `npm run gates` | Everything above in order, the same checks CI runs | ~10 s here |

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

This repo is being built in small pull requests; the README grows with each one.
