# Roadmap

What this repo has, what comes next, and what is left out on purpose. Each item lands as one small pull request with a Conventional Commits title, so the history reads like this list.

The order follows the motto: first **prove it before release**, then **confirm it in production**.

## Done

| Pull request | What it added |
|---|---|
| feat: daily transfer limit | The requirement, the risk list, `decideTransfer()` and its example and property-based tests |
| feat: the Guide | `AGENTS.md`, `CLAUDE.md`, the writing-tests skill and the PR template |
| ci: quality gates | Gates picked by changed files, one required `gate` check, mutation testing on changed code, name guard, payment data and secrets scans, and one readable report from `npm run gates` |
| docs: wording | Generic payment service wording, author name |

## Next

| Item | Why | Half of the motto |
|---|---|---|
| Make `gate` a required check on `main` | Until it is required, a red gate can still be merged | Prove it |
| PR size warning | Reviewers catch fewer defects in big changes, and agents make big changes cheap. Warn above 400 changed lines; above 1,000, the PR needs a written reason. Renames, moves, lockfiles and generated files don't count. Refactors get no automatic exception, because anyone can type `refactor:`; a large one gives its reason in one line. The Guide adds: keep refactors and behaviour changes in separate PRs | Prove it |
| Smoke tests | A tiny HTTP service around the limit check, and a few fast Playwright checks that it starts, answers and applies the limit. Runs as Stage 3 in CI | Prove it |
| End-to-end tests | A simple transfer page on that service, and Playwright tests of the whole customer journey: send transfers through the day, reach the limit exactly, then see the rejection and the amount left. Covers the Tier 1 risks from the customer's side | Prove it |
| Demo PR with weak tests | Tests that reach 100% coverage and still miss the limit edge. The mutation gate blocks it, which shows why coverage alone is not enough | Prove it |
| Dashboard on GitHub Pages | The four headline metrics on synthetic data, including one that is getting worse | Confirm it |
| Scheduled synthetic check | A Playwright check against the live dashboard every few hours; a failure opens an issue | Confirm it |
| Renovate | Dependency updates as small PRs, held for a week after release, so they go through the same gates | Prove it |
| Agent git guardrails | A Claude Code hook that blocks force pushes, pushes to `main` and other destructive git commands | Prove it |

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
