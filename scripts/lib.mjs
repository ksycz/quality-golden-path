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

/** Prints a failure message and stops with exit code 1, which fails the CI step. */
export const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};
