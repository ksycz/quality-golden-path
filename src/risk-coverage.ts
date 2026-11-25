// Tier 1 Risk Coverage from a Stryker mutation report.
// A risk's code is the code its tests run: every mutant covered by a test that names the risk.
// The risk counts as covered only if the test suite detects at least 80% of those mutants, the same
// bar as the mutation gate. Naming a risk in a test is not enough: the code behind it has to be
// tested well enough that a real bug there fails a test.

/** A test as Stryker's JSON report lists it. `name` includes the `describe` text. */
export interface ReportTest {
  id: string;
  name: string;
}

/** A mutant as Stryker's JSON report lists it. */
export interface ReportMutant {
  status: string;
  /** Tests that run the mutated code. Missing when no test does. */
  coveredBy?: string[];
}

export interface RiskResult {
  id: string;
  /** Tests whose name includes the risk ID. */
  tests: number;
  /** Mutants in the code those tests run. */
  mutants: number;
  /** Of those, the mutants the test suite kills or times out on. */
  detected: number;
  covered: boolean;
}

export interface RiskCoverage {
  risks: RiskResult[];
  listed: number;
  covered: number;
  /** Covered risks as a share of listed risks. Null when no risks are listed. */
  percent: number | null;
}

/** The same bar as the Tier 1 mutation gate. */
export const DETECTED_BAR = 80;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** True when `name` contains `id` as a whole ID: RISK-A matches "RISK-A: …", never "RISK-A-LONGER" or "RISK-AB". */
const names = (name: string, id: string) => new RegExp(`(^|[^\\w-])${escapeRegExp(id)}(?![\\w-])`).test(name);

const runBy = (m: ReportMutant, tests: Set<string>) => (m.coveredBy ?? []).some((id) => tests.has(id));

function measureRisk(id: string, tests: ReportTest[], mutants: ReportMutant[]): RiskResult {
  const own = new Set(tests.filter((t) => names(t.name, id)).map((t) => t.id));
  const run = mutants.filter((m) => runBy(m, own));
  const detected = run.filter((m) => m.status === 'Killed' || m.status === 'Timeout').length;
  const covered = run.length > 0 && detected * 100 >= DETECTED_BAR * run.length;
  return { id, tests: own.size, mutants: run.length, detected, covered };
}

export function measureRiskCoverage(riskIds: string[], tests: ReportTest[], mutants: ReportMutant[]): RiskCoverage {
  const risks = riskIds.map((id) => measureRisk(id, tests, mutants));
  const covered = risks.filter((r) => r.covered).length;
  return { risks, listed: risks.length, covered, percent: risks.length === 0 ? null : (covered * 100) / risks.length };
}
