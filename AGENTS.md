# AGENTS.md: the Guide

This repo is a **Tier 1** service: it decides whether money moves. The quality bar is the Definition of Tested below. It applies the same way to people and to every coding agent.

## The oracle is the requirement

Requirements live in `requirements/`. Risks live in `risks.yml`, each linked to a requirement. Tests encode what the requirement says, never what the code happens to do: when code and requirement disagree, the requirement wins and the code is the bug.

## Making a change

1. **Read** the requirement and the risks your change touches.
2. **Write the tests first**, from the requirement, and watch them go **red**. Before writing or reviewing any test, read `.claude/skills/writing-tests/SKILL.md`.
3. **Implement** until the tests go green.
4. **Run the local gates**: `npm run gates` runs everything CI runs, including mutation testing on the code you changed (committed or not). The README's Commands table explains each step.
5. **Open a pull request** using `.github/pull_request_template.md`.

Done means: every gate is green locally, and every risk your change touches has a test whose `describe` names its risk ID and requirement ID.

## Definition of Tested (Tier 1)

- Tests come from the requirement and name the risk and requirement they prove.
- Mutation score on changed code is at least 80%: tests must catch a real bug, not only pass.
- Money rules get boundary tests (exactly at the limit, one cent over, one cent under) and at least one property-based test (fast-check).
- Amounts are whole cents. Test amounts read in euros through `eur()` in `tests/money.ts`.
- Test data is synthetic. Secrets stay out of the repo, fixtures included.

## Guardrails

- A failing test is information. Fix the code, or stop and ask the human. Removing or weakening a test needs a human, named in the PR description.
- The quality configuration belongs to the QA Guild: `risks.yml` tiers, `quality.yml`, `.github/`, `CODEOWNERS` and this file. Change it only when the task is about it, and say so in the PR.
- Prefer the dependencies already in `package.json`. List every new dependency in the PR with why it is needed.

## Pull requests

- Work on a branch; `main` accepts changes only through a PR.
- Titles follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`, `chore:`, `build:`, `perf:`.
- Keep a PR under about 400 changed lines; `npm run check:size` counts them. Over 1,000 needs a line `Large PR: <why it can't be split>` in the description.
- Keep refactors and behaviour changes in separate PRs. A refactor leaves the tests unchanged; that is how it proves nothing changed.
- The person who ran the agent is the PR's author and does not approve it.
