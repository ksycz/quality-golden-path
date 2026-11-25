// PR size check: warns when a change is too big to review well, and fails when it is huge with no reason given.
// Run: npm run check:size   (compares your branch, including uncommitted changes, with origin/main)
//
// Reviewers catch far fewer defects past about 400 changed lines, and agents make big changes cheap.
// Limits live in quality.yml. Renamed or moved files count only the lines that changed in them;
// lockfiles and generated reports don't count. A PR over the maximum passes with a
// "Large PR: <reason>" line in its description, so a real large refactor isn't blocked.

import { readFileSync, appendFileSync } from 'node:fs';
import { WARN_CODE, c, fail, git, pass } from './lib.mjs';

// Limits from quality.yml, e.g. "pr_size_warn: 400".
const config = readFileSync('quality.yml', 'utf8');
const limit = (key) => Number(config.match(new RegExp(`^\\s*${key}:\\s*(\\d+)`, 'm'))?.[1]);
const WARN_AT = limit('pr_size_warn');
const MAX = limit('pr_size_max');

// Files that change a lot without anyone writing them.
const IGNORED = [/(^|\/)package-lock\.json$/, /^reports\//, /\.snap$/];

// Compare with the point where this branch left the base, so other people's merges don't count.
const base = process.env.BASE_REF ?? 'origin/main';
const mergeBase = git('merge-base', base, 'HEAD');
// --numstat prints "added<TAB>removed<TAB>path" per file; -M matches renames so a move counts only real edits.
// No "...HEAD": locally this includes uncommitted changes too.
const files = git('diff', '--numstat', '-M', mergeBase)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [added, removed, ...path] = line.split('\t');
    // Binary files show "-" for both counts; they count as zero lines.
    return { path: path.join(' '), lines: (Number(added) || 0) + (Number(removed) || 0) };
  })
  // New files not yet added to git don't appear in the diff, so count their lines too (locally only).
  .concat(
    git('ls-files', '--others', '--exclude-standard')
      .split('\n')
      .filter(Boolean)
      .map((path) => ({ path, lines: readFileSync(path, 'utf8').split('\n').length })),
  )
  .filter((file) => !IGNORED.some((re) => re.test(file.path)));

const total = files.reduce((sum, file) => sum + file.lines, 0);
// The PR description, in CI only. Locally there is no description yet.
const body = process.env.PR_BODY;
const reason = body?.match(/^\s*Large PR:\s*(\S.*)$/im)?.[1];

// The biggest files, to help decide where to split.
const biggest = files
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 5)
  .map((file) => `    ${String(file.lines).padStart(5)}  ${file.path}`)
  .join('\n');

// In GitHub Actions, a ::warning:: line shows as an annotation on the PR.
const annotate = (message) => {
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::warning title=PR size::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `> ⚠️ **PR size:** ${message}\n\n`);
};
const warn = (message) => {
  console.log(`${c.amber('!')} ${message}\n  Biggest files:\n${biggest}`);
  annotate(message);
  process.exit(WARN_CODE);
};

if (total <= WARN_AT) pass(`${total} changed lines (warning above ${WARN_AT})`);
else if (total <= MAX) warn(`${total} changed lines, over ${WARN_AT}. Consider splitting it so a reviewer can read all of it.`);
else if (reason) warn(`${total} changed lines, over ${MAX}, with a reason: "${reason}"`);
else if (body !== undefined) {
  fail(`${total} changed lines, over ${MAX}. Split the PR, or add a line "Large PR: <why it can't be split>" to its description.\n  Biggest files:\n${biggest}`);
} else warn(`${total} changed lines, over ${MAX}. CI will fail unless the PR description has a line "Large PR: <why it can't be split>".`);
