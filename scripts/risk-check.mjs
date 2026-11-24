// Every risk in risks.yml must be named by at least one test.
import { readFileSync } from 'node:fs';
import { fail, trackedTextFiles } from './lib.mjs';

const riskIds = [...readFileSync('risks.yml', 'utf8').matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]);
const tests = trackedTextFiles()
  .filter((file) => /^tests\/.*\.test\.ts$/.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const untested = riskIds.filter((id) => !tests.includes(id));
if (untested.length > 0) fail(`Risks without a test naming them: ${untested.join(', ')}`);
console.log(`✓ All ${riskIds.length} risks in risks.yml have a test naming them`);
