# Roadmap

What this repo has, what comes next, and what is left out on purpose. Each item lands as one small pull request with a Conventional Commits title, so the history reads like this list.

The plan follows the motto: first **prove it before release**, then **confirm it in production**.

## Done

In the order it landed.

| # | Change | What it added |
|---|---|---|
| 1 | feat: daily transfer limit | The requirement, the risk list, `decideTransfer()` and its example and property-based tests |
| 2 | feat: the Guide | `AGENTS.md`, `CLAUDE.md`, the writing-tests skill and the PR template |
| 3 | docs: licence name | Author name in the licence |
| 4 | ci: quality gates | Gates picked by changed files, one `gate` job, mutation testing on changed code, name guard, payment data and secrets scans, and one readable report from `npm run gates` |
| 5 | docs: payment service wording | Generic payment service wording in the README and the requirement |
| 6 | docs: roadmap | This file |
| 7 | Repo setting: required check | `gate` is a required check on `main`, accepted only from GitHub Actions, so a red gate blocks the merge |
| 8 | ci: PR size warning | Warns above 400 changed lines; above 1,000 the PR needs a `Large PR:` reason. Moves, lockfiles and reports don't count, and refactors get no automatic exception. The Guide keeps refactors and behaviour changes in separate PRs |
| 9 | Repo settings: security | Dependabot alerts on; workflows from outside contributors wait for approval; merged branches are deleted. Already on before: read-only workflow token, secret scanning with push protection |
| 10 | Demo PR (pull request 9) | An agent adds a €2,000 single-transfer maximum with `<` instead of `<=`, and tests that mirror the code. Every line runs and every test is green, but mutation scores 75% and `gate` blocks the merge. It stays open, labelled "do not merge" |
| 11 | ci: local gates like CI | `npm run gates` mutates only the code changed on the branch, including files not yet committed, so the laptop gives the same answer as CI |
| 12 | chore(deps): test tooling | Vitest 5.1.1, and patched `minimatch` and `qs` through overrides. Dependabot alerts went from 9 (3 critical) to 0 |
| 13 | test: smoke tests | A small HTTP API around the limit check (`npm start`), unit tests for its routing and input checks, and four Playwright API smoke tests against the running server. Stage 3 in CI, beside mutation |
| 14 | ci: clearer run page | Jobs named by what they check, a final check called `gate · can this PR merge?`, a Detail column on the Summary page, and the surviving mutants listed with the line of code they changed |
| 15 | ci: quiet Vitest summary | Vitest no longer adds its own report to the Summary page once per mutant |

## Next

In the order they will be built. The first two are what the deck still relies on.

| # | Item | Why | Half of the motto |
|---|---|---|---|
| 1 | End-to-end tests | A simple transfer page on that service, and Playwright tests of the whole customer journey: send transfers through the day, reach the limit exactly, then see the rejection and the amount left. Covers the Tier 1 risks from the customer's side | Prove it |
| 2 | Dashboard on GitHub Pages | The four headline metrics on synthetic data, including one that is getting worse | Confirm it |
| 3 | Scheduled synthetic check | A Playwright check against the live dashboard every few hours; a failure opens an issue | Confirm it |
| 4 | Renovate | Dependency updates as small PRs, held for a week after release, so they go through the same gates | Prove it |
| 5 | Agent git guardrails | A Claude Code hook that blocks force pushes, pushes to `main` and other destructive git commands | Prove it |

## Later

Ideas worth doing once the above is in place. Each needs more than this repo has today.

- **Tiering per change.** Pick the gates from the Risk Tier of the files touched, not of the whole repo.
- **Contract tests.** Need a second service to agree a contract with.
- **Flaky test quarantine.** Move a flaky test out of the required gate automatically, with an owner and a deadline to fix it.
- **AI Advisor.** An AI reviewer that comments on PRs, checked against a set of known good and bad PRs before anyone relies on it. It advises; a person still approves.
- **Canary release.** Send a small share of real traffic to a new version and roll back on errors. Needs a real deployment.

## Not planned

- **Code coverage as a gate.** Coverage shows what ran, not what was checked. Mutation score is the gate instead.
- **An AI reviewer that approves or merges on its own.** A person stays the approver for every change.
