// Gate selector: decides which gates a change needs, from the files it touches.
// Run: node scripts/changes.mjs  (CI runs it first and passes the answer to the other jobs)
//
// It looks at the files, never at the PR title, because an agent can label a code change "docs:".

import { appendFileSync } from 'node:fs';
import { changedFiles } from './lib.mjs';

// Markdown that is behaviour or policy, not documentation: a change here always runs every gate.
const NEVER_MINOR = [/^requirements\//, /^AGENTS\.md$/, /^CLAUDE\.md$/, /^\.claude\//, /^\.github\//];
// Files that are documentation, as long as they are not on the list above.
const DOCS = [/\.md$/, /^docs\//, /^LICENSE$/];

const files = changedFiles();
const isDocs = (file) => DOCS.some((re) => re.test(file)) && !NEVER_MINOR.some((re) => re.test(file));
// Run every gate unless every changed file is documentation.
// No changed files at all (e.g. a push to main) also runs every gate, to be safe.
const code = files.length === 0 || !files.every(isDocs);

console.log(`Changed files (${files.length}):\n${files.map((f) => `  ${isDocs(f) ? 'docs' : 'code'}  ${f}`).join('\n')}`);
console.log(code ? '→ code change: all gates run' : '→ docs-only change: heavy gates skipped');

// In GitHub Actions, writing "code=true" to this file makes it an output other jobs can read.
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${code}\n`);
