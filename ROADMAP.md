# Roadmap

What this repo has, what comes next, and what is left out on purpose. Each item lands as one small pull request with a Conventional Commits title, so the history reads like this list.

The plan follows the strategy: first **prove it before release**, then **confirm it in production**.

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
| 16 | feat: transfer page | A page where a customer sends transfers and sees what is left of today's limit, on the same API |
| 17 | test: end-to-end tests | Playwright in Chromium on the transfer page, one test per Tier 1 risk. Stage 4 in CI, with a trace and report kept when a test fails |
| 18 | ci: PR description check | Cheap checks fail a PR whose description skips the template's sections, or whose "How to test locally" has only the default commands |
| 19 | feat: dashboard metrics | The four headline metrics and the good-or-lucky boxes, computed from 12 weeks of synthetic data, with tests |
| 20 | feat: dashboard page | One static page from `npm run dashboard`: 4-week trends with counts, "What isn't working", good or lucky, diagnostics |
| 21 | ci: dashboard on GitHub Pages | Published after every merge to main that touches it: https://ksycz.github.io/quality-golden-path/ |
| 22 | feat: dashboard metrics as JSON | `npm run dashboard` also writes `metrics.json`, the page's numbers for other tools, computed by the same functions |
| 23 | feat: Risk Coverage from a real run | `npm run risk-coverage` reads `risks.yml` and the mutation report: a risk counts when the suite catches 80% or more of the mutants in the code its tests run |
| 24 | docs: README starts with the demo | The README opens with pull request 9 and says what is built and what is only described |
| 25 | fix: quality config and docs | The mutation bar is read from `quality.yml`; synthetic teams are named "Team …"; docs match the strategy |
| 26 | ci: guard removed tests and new packages | Cheap checks fail a PR that removes or skips tests without a named approver, or adds a package that isn't on npm or isn't named with a reason. A boundary property test and a one-reason customer-id test |

## Next

In the order they will be built. The first one closes the biggest gap between the strategy and this repo.

| # | Item | Why | Half of the strategy |
|---|---|---|---|
| 1 | Scheduled synthetic check | A Playwright check against the live dashboard every few hours; a failure opens an issue | Confirm it |
| 2 | Renovate | Dependency updates as small PRs, held for a week after release, so they go through the same gates | Prove it |
| 3 | Agent git guardrails | A Claude Code hook that blocks force pushes, pushes to `main` and other destructive git commands | Prove it |

## Later

Ideas worth doing once the above is in place. Each needs more than this repo has today.

- **Tiering per change.** Pick the gates from the Risk Tier of the files touched, not of the whole repo.
- **Contract tests.** Need a second service to agree a contract with.
- **Flaky test quarantine.** Move a flaky test out of the required gate automatically, with an owner and a deadline to fix it.
- **AI Advisor.** An AI reviewer that comments on PRs, checked against a set of known good and bad PRs before anyone relies on it. It advises; a person still approves.
- **Canary release.** Send a small share of real traffic to a new version and roll back on errors. Needs a real deployment.
- **Accessibility checks.** Run @axe-core/playwright on the transfer page in Stage 4, so a missing label or poor contrast fails the PR.
- **More browsers.** Add Firefox and WebKit to the e2e projects once customers use them enough to justify the extra CI time.

## Not planned

- **Code coverage as a gate.** Coverage shows what ran, not what was checked. Mutation score is the gate instead.
- **An AI reviewer that approves or merges on its own.** A person approves every Tier 1 change, as here. Auto-merge, where the strategy allows it, rests on deterministic gates and service health, never on an AI verdict.
