// Small helpers shared by the gate scripts in this folder.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Runs a git command and returns its output as text, e.g. git('ls-files'). */
export const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** All files git tracks, minus binary ones (a binary file contains a zero byte). */
export function trackedTextFiles() {
  return git('ls-files')
    .split('\n')
    .filter(Boolean)
    .filter((file) => {
      const content = readFileSync(file);
      return !content.includes(0);
    });
}

/**
 * Files changed on this branch compared with the base branch.
 * "base...HEAD" (three dots) compares against the point where the branch started,
 * so changes that landed on main in the meantime are not counted.
 * BASE_REF is set by CI; locally it defaults to origin/main.
 */
export function changedFiles(base = process.env.BASE_REF ?? 'origin/main') {
  return git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
}

// Terminal colours (ANSI codes). Off when output goes to a file or NO_COLOR is set;
// on in GitHub Actions, whose log viewer shows colours.
const useColor = (process.stdout.isTTY || process.env.GITHUB_ACTIONS === 'true') && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));
export const c = {
  green: paint('32'),
  red: paint('31'),
  amber: paint('33'),
  dim: paint('2'),
  bold: paint('1'),
  inverseGreen: paint('30;42'), // black on green: a PASS badge
  inverseRed: paint('97;41'), // white on red: a FAIL badge
  inverseAmber: paint('30;43'), // black on amber: a SKIP badge
};

/** Prints a green success line. */
export const pass = (message) => console.log(`${c.green('✓')} ${message}`);

/** Prints a red failure message and stops with exit code 1, which fails the CI step. */
export const fail = (message) => {
  console.error(`${c.red('✗')} ${c.red(message)}`);
  process.exit(1);
};

// Exit code a check uses when its tool isn't installed on this machine. The gate report shows it as SKIP.
export const SKIP_CODE = 78;

// Exit code a check uses for a warning: shown as WARN in the report, and it doesn't fail the run.
export const WARN_CODE = 79;

// Changed files including work not committed yet: edits since this branch left the base, plus new
// files git doesn't track yet. Locally that is what you are about to push; in CI it equals changedFiles().
export function changedFilesWithLocal(base = process.env.BASE_REF ?? 'origin/main') {
  const mergeBase = git('merge-base', base, 'HEAD');
  const edited = git('diff', '--name-only', '--diff-filter=d', mergeBase).split('\n');
  const added = git('ls-files', '--others', '--exclude-standard').split('\n');
  return [...new Set([...edited, ...added])].filter(Boolean);
}

/**
 * One-line results pulled from a gate's output, e.g. "38 passed". Shared by `npm run gates`
 * (the laptop report) and scripts/ci-summary.mjs (the GitHub run summary), so both say the same thing.
 */
export const RESULT = {
  tests: (out) => out.match(/Tests\s+(\d+ (?:failed|passed)[^\n(]*)/)?.[1]?.trim(),
  risks: (out) => out.match(/All (\d+) risks/)?.[1]?.concat(' risks covered'),
  size: (out) => out.match(/(\d+) changed lines/)?.[0],
  mutation: (out) => {
    // Stryker's table row: "All files | 95.24 | ... | killed | timeout | survived | ..."
    const row = out.match(/All files\s*\|\s*([\d.]+)\s*\|\s*[\d.]+\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)/);
    if (row) return `${row[1]}% · ${row[2]} killed, ${row[4]} survived`;
    return /No source files changed/.test(out) ? 'no source code changed' : undefined;
  },
  // In CI two Playwright reporters print the same counts, so each one is kept once.
  smoke: (out) => [...new Set(out.match(/\d+ (?:passed|failed)/g))].join(', ') || undefined,
  e2e: (out) => RESULT.smoke(out),
};
