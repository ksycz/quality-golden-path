// Decides which gates a change needs, from the files it touches.
// Never from the PR title: an agent can label a code change "docs:".
import { appendFileSync } from 'node:fs';
import { changedFiles } from './lib.mjs';

// Markdown that is behaviour or policy, not documentation.
const NEVER_MINOR = [/^requirements\//, /^AGENTS\.md$/, /^CLAUDE\.md$/, /^\.claude\//, /^\.github\//];
const DOCS = [/\.md$/, /^docs\//, /^LICENSE$/];

const files = changedFiles();
const isDocs = (file) => DOCS.some((re) => re.test(file)) && !NEVER_MINOR.some((re) => re.test(file));
const code = files.length === 0 || !files.every(isDocs);

console.log(`Changed files (${files.length}):\n${files.map((f) => `  ${isDocs(f) ? 'docs' : 'code'}  ${f}`).join('\n')}`);
console.log(code ? '→ code change: all gates run' : '→ docs-only change: heavy gates skipped');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${code}\n`);
