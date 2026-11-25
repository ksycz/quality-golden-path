// Mutation gate on changed code: the Tier 1 evidence gate.
// Run: npm run mutation:changed   (compares with origin/main; CI sets BASE_REF)
//
// Stryker makes small changes ("mutants") to the code, e.g. "<=" to "<", and runs the tests
// against each one. A good test suite fails on, or "kills", each mutant. If fewer than 80%
// are killed (see stryker.config.mjs), this step fails: the tests pass but don't prove much.
// Only changed source files are mutated, to keep the PR fast; the full run is `npm run mutation`.

import { execFileSync } from 'node:child_process';
import { changedFilesWithLocal } from './lib.mjs';
import stryker from '../stryker.config.mjs';

// Files stryker.config.mjs excludes with "!path" stay excluded here too.
const excluded = new Set(stryker.mutate.filter((p) => p.startsWith('!')).map((p) => p.slice(1)));

// Includes uncommitted and new files, so running it before a commit checks what you are about to push.
const changed = changedFilesWithLocal().filter((file) => /^src\/.*\.ts$/.test(file) && !excluded.has(file));
if (changed.length === 0) {
  console.log('✓ No source files changed: mutation gate not needed');
  process.exit(0);
}
console.log(`Mutating changed files: ${changed.join(', ')}`);
// stdio: 'inherit' shows Stryker's own report in the terminal or CI log.
execFileSync('npx', ['stryker', 'run', '--mutate', changed.join(',')], { stdio: 'inherit' });
