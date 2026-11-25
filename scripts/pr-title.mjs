// PR title check: titles follow Conventional Commits, e.g. "feat: …" or "fix(limits): …".
// Run: npm run check:title -- "feat: my change"   (CI passes the real title in PR_TITLE)
//
// Readable history, and changelogs for free. The prefix never decides which gates run;
// scripts/changes.mjs decides that from the changed files.

import { fail } from './lib.mjs';

const TYPES = ['feat', 'fix', 'docs', 'test', 'refactor', 'ci', 'chore', 'build', 'perf'];
const title = process.env.PR_TITLE ?? process.argv[2] ?? '';
// type, optional (scope), optional ! for a breaking change, then ": " and a description.
const pattern = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.*$`);

if (!pattern.test(title)) fail(`PR title "${title}" must start with one of: ${TYPES.map((t) => `${t}:`).join(' ')}`);
console.log(`✓ PR title follows Conventional Commits`);
