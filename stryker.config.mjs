// Stryker mutation testing settings. Used by `npm run mutation` (all code)
// and `npm run mutation:changed` (only files changed on this branch).
import { readFileSync } from 'node:fs';

// The mutation bar comes from quality.yml (mutation_score_min), the file the QA Guild owns,
// so the number the Guild sets is the number CI enforces.
// Read from the repo root, like every gate script.
const quality = readFileSync('quality.yml', 'utf8');
const MUTATION_MIN = Number(quality.match(/^\s*mutation_score_min:\s*(\d+)/m)?.[1]);
if (!Number.isInteger(MUTATION_MIN)) throw new Error('quality.yml has no mutation_score_min');

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',               // run mutants with our normal Vitest tests
  // Production code only, never the tests. server.ts is wiring with no logic; the smoke tests cover it.
  mutate: ['src/**/*.ts', '!src/server.ts'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' }, // open in a browser to see each mutant
  jsonReporter: { fileName: 'reports/mutation/mutation.json' }, // read by the dashboard later
  // Score = % of mutants the tests kill. Below "break" the run fails: the Tier 1 gate (80% in quality.yml).
  thresholds: { high: Math.max(90, MUTATION_MIN), low: MUTATION_MIN, break: MUTATION_MIN },
  tempDirName: '.stryker-tmp',
};
