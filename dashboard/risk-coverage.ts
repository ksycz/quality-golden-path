// Tier 1 Risk Coverage for this service, from a real mutation run.
// Run: npm run risk-coverage   (a full Stryker run, then this script)
//
// Reads risks.yml and reports/mutation/mutation.json and prints, per risk, how many of the mutants
// in the code its tests run are detected by the test suite. The dashboard's numbers are synthetic; this is how
// a nightly job would compute the real ones.
import { readFileSync } from 'node:fs';
import { DETECTED_BAR, measureRiskCoverage, type ReportMutant, type ReportTest } from '../src/risk-coverage.ts';

interface Report {
  files: Record<string, { mutants: ReportMutant[] }>;
  testFiles?: Record<string, { tests: ReportTest[] }>;
}

const root = new URL('../', import.meta.url);
const riskIds = [...readFileSync(new URL('risks.yml', root), 'utf8').matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]!);
const report = JSON.parse(readFileSync(new URL('reports/mutation/mutation.json', root), 'utf8')) as Report;

const tests = Object.values(report.testFiles ?? {}).flatMap((f) => f.tests);
const mutants = Object.values(report.files).flatMap((f) => f.mutants);
const result = measureRiskCoverage(riskIds, tests, mutants);

console.table(result.risks.map((r) => ({
  risk: r.id, tests: r.tests, mutants: r.mutants, detected: r.detected,
  [`covered (≥ ${DETECTED_BAR}%)`]: r.covered ? 'yes' : 'no',
})));
const share = result.percent === null ? 'n/a' : `${Math.round(result.percent)}%`;
console.log(`Tier 1 Risk Coverage: ${result.covered} of ${result.listed} risks (${share})`);
