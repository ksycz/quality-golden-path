// Risk check: every risk in risks.yml must be named by at least one test.
// Run: npm run check:risks
//
// Fails with the IDs of risks that no test mentions. This keeps the risk list and the
// tests in step: a new risk without a test, or a deleted test, shows up straight away.

import { readFileSync } from 'node:fs';
import { fail, pass, trackedTextFiles } from './lib.mjs';

// Read the risk IDs from lines like "  - id: RISK-TL-BOUNDARY".
const riskIds = [...readFileSync('risks.yml', 'utf8').matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]);

// All test code in one string, so we can search it for each ID.
const tests = trackedTextFiles()
  .filter((file) => /^tests\/.*\.test\.ts$/.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const untested = riskIds.filter((id) => !tests.includes(id));
if (untested.length > 0) fail(`Risks without a test naming them: ${untested.join(', ')}`);
pass(`All ${riskIds.length} risks in risks.yml have a test naming them`);
