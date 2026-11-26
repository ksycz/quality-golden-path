<!-- Title: Conventional Commits, e.g. "feat: …", "fix: …", "docs: …" -->

## What and why

<!-- One or two sentences. Over 1,000 changed lines? Add a line: Large PR: <why it can't be split> -->

## Tier 1 only

- **Requirement:** <!-- e.g. REQ-TL-1, link to requirements/… -->
- **Risks touched:** <!-- e.g. RISK-TL-BOUNDARY -->
- **Test intent:** <!-- In plain words: which behaviour the new tests prove, and how they would fail. -->

## How to test locally

```bash
npm ci          # install exact dependency versions
npm run gates   # run every gate CI runs, including mutation testing
```

<!-- Add the exact steps a reviewer can run to see this change work. -->

## Checklist

- [ ] No test was removed or weakened (or a human approved it, in a line `Test removed: <what and why>, approved by <name>`)
- [ ] New dependencies named with a reason, one line each: `New dependency: <name>: <why it is needed>` (or none)
- [ ] Only synthetic data, no secrets
- [ ] Agent-written: yes / no, and who ran it
