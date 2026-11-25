// PR description check: the description follows .github/pull_request_template.md.
// Run: npm run check:description -- path/to/description.md   (CI passes the real description in PR_BODY)
//
// A reviewer needs to know why the change exists and how to see it work. Agents skip templates
// as readily as people do, so this is checked rather than asked for.
// "How to test locally" must say more than the template's default npm ci / npm run gates: those two
// lines prove the gates pass, not that this change does what it says.

import { readFileSync } from 'node:fs';
import { fail, pass } from './lib.mjs';

const REQUIRED = ['What and why', 'How to test locally', 'Checklist'];
const DEFAULT_STEPS = [/^npm ci\b.*$/gm, /^npm run gates\b.*$/gm, /^```(bash)?$/gm];

const file = process.argv[2];
const body = (process.env.PR_BODY ?? (file ? readFileSync(file, 'utf8') : '')).replace(/\r\n/g, '\n');

/** The text under a "## <title>" heading, up to the next "## " heading, without HTML comments. */
function section(title) {
  const start = body.search(new RegExp(`^## ${title}\\s*$`, 'm'));
  if (start === -1) return null;
  const rest = body.slice(start).split('\n').slice(1).join('\n');
  const end = rest.search(/^## /m);
  return (end === -1 ? rest : rest.slice(0, end)).replace(/<!--[\s\S]*?-->/g, '').trim();
}

const problems = [];
for (const title of REQUIRED) {
  const text = section(title);
  if (text === null) problems.push(`the "## ${title}" section is missing`);
  else if (text === '') problems.push(`the "## ${title}" section is empty`);
}
const howTo = section('How to test locally');
if (howTo) {
  const ownSteps = DEFAULT_STEPS.reduce((text, line) => text.replace(line, ''), howTo).trim();
  if (ownSteps === '') problems.push('"How to test locally" has only the default npm ci / npm run gates: add the steps that show this change working');
}

if (problems.length > 0) {
  fail(`PR description doesn't follow .github/pull_request_template.md:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
}
pass('PR description has What and why, How to test locally, and Checklist');
