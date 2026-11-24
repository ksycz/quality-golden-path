# quality-golden-path

A small, public demo of a **quality golden path for teams where coding agents write much of the code**.

> Prove it before release. Confirm it in production.

The domain is synthetic: a payment service's **daily transfer limit**. Nothing here comes from any real company, and all data is made up.

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

## Run it

```bash
nvm use        # Node 22
npm ci
npm run typecheck
npm test
```

This repo is being built in small pull requests; the README grows with each one.
