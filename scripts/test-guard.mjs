// Test guard: fails a PR that removes tests or assertions, or skips a test, unless the description names who approved it.
// Run: npm run check:tests   (compares your branch, including uncommitted changes, with origin/main)
//
// An agent stuck on a red test can make it green by deleting, loosening or skipping it. The mutation gate
// mutates only changed source files, so a PR that touches only tests never reaches it. This check counts,
// across tests/, e2e/ and smoke/: test cases, expect() assertions, and tests that are skipped, focused
// with .only, or left as todo or fixme. Fewer tests, fewer assertions or more skipped tests than on the
// base branch fails, unless the description has a line "Test removed: <what and why>, approved by <name>".
// Moving a test to another file is fine: the totals stay the same.
// It counts, it doesn't read: a changed expected value is for the reviewer.

import { existsSync, readFileSync } from 'node:fs';
import { WARN_CODE, c, fail, git, pass } from './lib.mjs';

const DIRS = ['tests', 'e2e', 'smoke'];
const LINE = 'Test removed: <what and why>, approved by <name>';

// it(…), test(…), it.each(…)(…) and it.each`…`: each is one test case in the source.
const TEST = /\b(?:it|test)(?:\.(?:each|concurrent))?\s*[(`]/g;
// expect(…) and Playwright's expect.soft(…).
const ASSERTION = /\bexpect(?:\.soft)?\s*\(/g;
// it.skip, it.only, it.todo, test.fixme, describe.skip… and the older xit / xdescribe / fit forms.
// Only at the start of a line, where a real skip is: the same words inside a string (as in this
// check's own tests) aren't a skipped test.
const SKIPPED = /^\s*(?:(?:it|test|describe)\.(?:skip|only|todo|fixme)\b|(?:xit|xtest|xdescribe|fit|fdescribe)\s*\()/gm;

const count = (text, re) => text.match(re)?.length ?? 0;
const tally = (texts) => ({
  tests: texts.reduce((sum, t) => sum + count(t, TEST), 0),
  assertions: texts.reduce((sum, t) => sum + count(t, ASSERTION), 0),
  skipped: texts.reduce((sum, t) => sum + count(t, SKIPPED), 0),
});

// The base: test files where this branch left the base branch, so other people's merges don't count.
const base = process.env.BASE_REF ?? 'origin/main';
const mergeBase = git('merge-base', base, 'HEAD');
const baseFiles = git('ls-tree', '-r', '--name-only', mergeBase, '--', ...DIRS).split('\n').filter(Boolean);
const before = tally(baseFiles.map((file) => git('show', `${mergeBase}:${file}`)));

// Now: the files on disk, so locally uncommitted and new files count too.
const nowFiles = git('ls-files', '--cached', '--others', '--exclude-standard', '--', ...DIRS)
  .split('\n')
  .filter((file) => file && existsSync(file));
const now = tally(nowFiles.map((file) => readFileSync(file, 'utf8')));

const summary = `${now.tests} test cases written, ${now.assertions} expect() calls, ${now.skipped} skipped or focused`;
const dropped = [
  now.tests < before.tests && `test cases ${before.tests} → ${now.tests}`,
  now.assertions < before.assertions && `expect() calls ${before.assertions} → ${now.assertions}`,
  now.skipped > before.skipped && `skipped or focused ${before.skipped} → ${now.skipped}`,
].filter(Boolean);

if (dropped.length === 0) {
  pass(`${summary}: nothing removed or skipped compared with ${base}`);
  process.exit(0);
}

const what = `compared with ${base}: ${dropped.join(', ')}`;
// The PR description, in CI only. Locally there is no description yet.
const body = process.env.PR_BODY;
const approval = body?.match(/^\s*Test removed:\s*(\S.*\bapproved by\s+\S.*)$/im)?.[1];

if (approval) {
  console.log(`${c.amber('!')} Tests weakened ${what}. Approved in the description: "${approval}"`);
  process.exit(WARN_CODE);
}
if (body !== undefined) {
  fail(`Tests weakened ${what}.\n  Fix the code instead, or have a person approve it and add a line to the PR description:\n  ${LINE}`);
}
console.log(`${c.amber('!')} Tests weakened ${what}.\n  CI will fail unless the PR description has a line "${LINE}".`);
process.exit(WARN_CODE);
