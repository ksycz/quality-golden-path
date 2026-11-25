// Stryker mutation testing settings. Used by `npm run mutation` (all code)
// and `npm run mutation:changed` (only files changed on this branch).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',               // run mutants with our normal Vitest tests
  // Production code only, never the tests. server.ts is wiring with no logic; the smoke tests cover it.
  mutate: ['src/**/*.ts', '!src/server.ts'],
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' }, // open in a browser to see each mutant
  jsonReporter: { fileName: 'reports/mutation/mutation.json' }, // read by the dashboard later
  // Score = % of mutants the tests kill. Below "break" the run fails: the Tier 1 gate (80%).
  thresholds: { high: 90, low: 80, break: 80 },
  tempDirName: '.stryker-tmp',
};
