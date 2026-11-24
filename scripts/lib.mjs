import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Tracked text files (binary files are skipped). */
export function trackedTextFiles() {
  return git('ls-files')
    .split('\n')
    .filter(Boolean)
    .filter((file) => {
      const content = readFileSync(file);
      return !content.includes(0);
    });
}

/** Files changed between the base branch and HEAD. */
export function changedFiles(base = process.env.BASE_REF ?? 'origin/main') {
  return git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
}

export const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};
