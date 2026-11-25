// Turns a gate's saved output into a one-line result for the GitHub run page.
// Run (CI only): node scripts/ci-summary.mjs <tests|risks|mutation|smoke> <log file>
//
// It writes the result two ways:
//   - as a job output, so the final "gate" job can put it in its table on the run's Summary page;
//   - as a short section in this job's own summary, with the detail a reader needs when it fails
//     (the surviving mutants, or each smoke test and whether it passed).
// It never fails the job: the gate step itself already passed or failed.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util'; // removes colour codes from the saved log
import { RESULT } from './lib.mjs';

const [kind, logFile] = process.argv.slice(2);
const log = existsSync(logFile) ? stripVTControlCharacters(readFileSync(logFile, 'utf8')) : '';
const result = RESULT[kind]?.(log) ?? 'no result: see the job log';

const sections = { tests: 'Tests', risks: 'Risks have tests', mutation: 'Mutation score on changed code', smoke: 'Smoke tests' };
const lines = [`### ${sections[kind] ?? kind}`, '', `**${result}**`, ''];

// Mutation: list every surviving mutant, i.e. a code change no test noticed.
if (kind === 'mutation' && existsSync('reports/mutation/mutation.json')) {
  const report = JSON.parse(readFileSync('reports/mutation/mutation.json', 'utf8'));
  const survived = Object.entries(report.files).flatMap(([file, { source, mutants }]) =>
    mutants
      .filter((m) => m.status === 'Survived')
      .map((m) => {
        const line = m.location.start.line;
        const code = source.split('\n')[line - 1].trim().replaceAll('|', '\\|');
        return `| \`${file}:${line}\` | \`${code}\` | \`${(m.replacement ?? '').replaceAll('|', '\\|')}\` |`;
      }),
  );
  if (survived.length > 0) {
    lines.push('Changes to the code that no test noticed:', '', '| Where | The code | Changed to, and every test still passed |', '|---|---|---|', ...survived, '');
  }
}

// Smoke: one line per test, as Playwright's list reporter printed it.
if (kind === 'smoke') {
  const tests = log.split('\n').filter((line) => /^\s*[✓✘]/.test(line));
  if (tests.length > 0) lines.push(...tests.map((line) => `- ${line.trim().replace(/^✓\s+\d+\s+/, '✅ ').replace(/^✘\s+\d+\s+/, '❌ ').replace(/\S+\.smoke\.ts:\d+:\d+ › /, '')}`), '');
}

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${kind}=${result}\n`);
console.log(`${sections[kind] ?? kind}: ${result}`);
