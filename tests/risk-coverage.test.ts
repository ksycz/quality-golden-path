// Tier 1 Risk Coverage from a real mutation report. A risk's code is the code its tests run; the risk
// counts only if the suite detects at least 80% of the mutants there: the same bar as the mutation gate.
import { describe, expect, it } from 'vitest';
import { measureRiskCoverage, type ReportMutant, type ReportTest } from '../src/risk-coverage';

const tests: ReportTest[] = [
  { id: '1', name: 'RISK-A · REQ-1: approves at the limit' },
  { id: '2', name: 'RISK-A · REQ-1: rejects one cent over' },
  { id: '3', name: 'RISK-B · REQ-2: rejects a zero amount' },
  { id: '4', name: 'a test that names no risk' },
];

/** `n` mutants, all with the same status, in code run by the tests in `coveredBy`. */
const mutants = (n: number, status: string, coveredBy: string[]): ReportMutant[] =>
  Array.from({ length: n }, () => ({ status, coveredBy }));

describe('Risk Coverage: a risk counts only when the code its tests run catches 80% of mutants', () => {
  it('counts a risk when every mutant in its code is killed', () => {
    const result = measureRiskCoverage(['RISK-A'], tests, mutants(5, 'Killed', ['1', '2']));
    expect(result.risks).toEqual([{ id: 'RISK-A', tests: 2, mutants: 5, detected: 5, covered: true }]);
    expect(result).toMatchObject({ listed: 1, covered: 1, percent: 100 });
  });

  it('counts a risk at exactly 80% detected', () => {
    const report = [...mutants(4, 'Killed', ['1']), ...mutants(1, 'Survived', ['1'])];
    expect(measureRiskCoverage(['RISK-A'], tests, report).risks[0]).toMatchObject({ detected: 4, covered: true });
  });

  it('does not count a risk just under 80% detected', () => {
    const report = [...mutants(79, 'Killed', ['1']), ...mutants(21, 'Survived', ['1'])];
    expect(measureRiskCoverage(['RISK-A'], tests, report).risks[0]).toMatchObject({ detected: 79, covered: false });
  });

  it('counts a mutant killed by any test, since the bug is caught either way', () => {
    // RISK-A's test passes through input checks that RISK-B's tests are there to prove.
    const report = mutants(1, 'Killed', ['1', '3']);
    const result = measureRiskCoverage(['RISK-A', 'RISK-B'], tests, report);
    expect(result.risks.map((r) => [r.id, r.covered])).toEqual([['RISK-A', true], ['RISK-B', true]]);
  });

  it('only looks at code the risk’s own tests run', () => {
    // A survivor in RISK-B's code doesn't count against RISK-A.
    const report = [...mutants(1, 'Killed', ['1']), ...mutants(1, 'Survived', ['3'])];
    const result = measureRiskCoverage(['RISK-A', 'RISK-B'], tests, report);
    expect(result.risks.map((r) => [r.id, r.mutants, r.covered])).toEqual([['RISK-A', 1, true], ['RISK-B', 1, false]]);
  });

  it('counts a timeout as detected when the risk’s tests run that code', () => {
    // A mutant that makes the tests hang is caught: Stryker counts timeouts as detected too.
    const report = mutants(1, 'Timeout', ['3']);
    expect(measureRiskCoverage(['RISK-B'], tests, report).risks[0]).toMatchObject({ detected: 1, covered: true });
  });

  it('ignores mutants the risk’s tests never run', () => {
    const report = [...mutants(1, 'Killed', ['1']), ...mutants(3, 'Survived', ['4']), ...mutants(2, 'NoCoverage', [])];
    expect(measureRiskCoverage(['RISK-A'], tests, report).risks[0]).toMatchObject({ mutants: 1, covered: true });
  });

  it('does not count a risk with no test naming it', () => {
    const result = measureRiskCoverage(['RISK-C'], tests, mutants(1, 'Killed', ['1']));
    expect(result.risks[0]).toEqual({ id: 'RISK-C', tests: 0, mutants: 0, detected: 0, covered: false });
  });

  it('does not count a risk whose tests run no mutated code, because there is no evidence', () => {
    expect(measureRiskCoverage(['RISK-A'], tests, []).risks[0]).toMatchObject({ tests: 2, covered: false });
  });

  it('matches whole risk IDs only', () => {
    const named: ReportTest[] = [{ id: '9', name: 'RISK-A-LONGER: a different risk' }, { id: '8', name: 'RISK-AB: another' }];
    expect(measureRiskCoverage(['RISK-A'], named, mutants(1, 'Killed', ['9', '8'])).risks[0]).toMatchObject({ tests: 0 });
  });

  it('gives a share in percent across all listed risks, and null when none are listed', () => {
    const report = mutants(1, 'Killed', ['1']);
    expect(measureRiskCoverage(['RISK-A', 'RISK-B', 'RISK-C', 'RISK-D'], tests, report)).toMatchObject({ listed: 4, covered: 1, percent: 25 });
    expect(measureRiskCoverage([], tests, report)).toMatchObject({ listed: 0, covered: 0, percent: null });
  });

  it('accepts a mutant without coveredBy, as Stryker writes for code no test runs', () => {
    expect(measureRiskCoverage(['RISK-A'], tests, [{ status: 'NoCoverage' }]).risks[0]).toMatchObject({ mutants: 0 });
  });
});
