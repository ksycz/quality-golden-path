// End-to-end tests in a real browser: npm run e2e
//
// Needs Chromium for Playwright. If it isn't installed on this machine, the gate shows SKIP
// with the install command instead of failing; CI always installs it and always runs the tests.

import { spawnSync } from 'node:child_process';
import { SKIP_CODE } from './lib.mjs';

const run = spawnSync('npx', ['playwright', 'test', '--project=e2e'], { encoding: 'utf8' });
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;

if (/Executable doesn't exist|npx playwright install/.test(output) && !process.env.CI) {
  console.log('– Chromium not installed here: run npx playwright install chromium');
  process.exit(SKIP_CODE);
}
process.stdout.write(output);
process.exit(run.status ?? 1);
