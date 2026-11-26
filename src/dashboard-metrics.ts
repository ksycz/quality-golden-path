// The four headline metrics and the "good or lucky" view, computed from weekly numbers.
// Definitions match the deck: escaped defects are per 100 releases, trends compare the last
// 4 weeks with the 4 before, and a small change counts as steady, not as better or worse.

/** One week of numbers for one service or the whole department. */
export interface Week {
  /** Monday of the week, YYYY-MM-DD. */
  week: string;
  releases: number;
  /** Releases that caused a rollback, hotfix or incident. */
  failedReleases: number;
  /** Bugs in money and identity flows found in production. */
  tier1Escaped: number;
  /** Median minutes from PR marked ready for review to evidence ready; draft time doesn't count. */
  feedbackMinutes: number;
  /** Listed Tier 1 risks, and how many have a test that kills its mutants. */
  risksListed: number;
  risksCovered: number;
}

export type Direction = 'better' | 'worse' | 'steady';

export interface Trend {
  /** The last 4 weeks. Null when there were no releases to divide by. */
  current: number | null;
  /** The 4 weeks before. */
  previous: number | null;
  direction: Direction;
}

export const WINDOW_WEEKS = 4;

/** part as a share of whole, in percent, or null when whole is 0. */
export function percent(part: number, whole: number): number | null {
  return whole === 0 ? null : (part / whole) * 100;
}

/**
 * Is the change from previous to current better, worse or steady?
 * goodWhen says which way is good; a change of at most `steadyWithin` either way is steady.
 */
export function compare(
  current: number | null,
  previous: number | null,
  goodWhen: 'up' | 'down',
  steadyWithin: number,
): Direction {
  if (current === null || previous === null) return 'steady';
  const change = current - previous;
  if (Math.abs(change) <= steadyWithin) return 'steady';
  const wentUp = change > 0;
  return wentUp === (goodWhen === 'up') ? 'better' : 'worse';
}

const sum = (weeks: Week[], pick: (w: Week) => number) => weeks.reduce((total, w) => total + pick(w), 0);

/** Splits the weeks into the last window and the window before it. */
function windows(weeks: Week[]): [Week[], Week[]] {
  const current = weeks.slice(-WINDOW_WEEKS);
  const previous = weeks.slice(-2 * WINDOW_WEEKS, -WINDOW_WEEKS);
  return [current, previous];
}

/** Share of releases that caused a rollback, hotfix or incident. Lower is better. */
export function changeFailureRate(weeks: Week[]): Trend {
  const rate = (ws: Week[]) => percent(sum(ws, (w) => w.failedReleases), sum(ws, (w) => w.releases));
  const [now, before] = windows(weeks);
  return trend(rate(now), rate(before), 'down', 1);
}

/** Tier 1 escaped defects per 100 releases, so more releases don't look like worse quality. Lower is better. */
export function escapedPer100Releases(weeks: Week[]): Trend {
  const rate = (ws: Week[]) => percent(sum(ws, (w) => w.tier1Escaped), sum(ws, (w) => w.releases));
  const [now, before] = windows(weeks);
  return trend(rate(now), rate(before), 'down', 0.2);
}

/** Average of the weekly median feedback times, in minutes. Lower is better. */
export function feedbackTime(weeks: Week[]): Trend {
  const average = (ws: Week[]) => (ws.length === 0 ? null : sum(ws, (w) => w.feedbackMinutes) / ws.length);
  const [now, before] = windows(weeks);
  return trend(average(now), average(before), 'down', 1);
}

/** Tier 1 Risk Coverage at the end of each window: a point in time, not an average. Higher is better. */
export function riskCoverage(weeks: Week[]): Trend {
  const at = (w: Week | undefined) => (w === undefined ? null : percent(w.risksCovered, w.risksListed));
  const [now, before] = windows(weeks);
  return trend(at(now.at(-1)), at(before.at(-1)), 'up', 2);
}

function trend(current: number | null, previous: number | null, goodWhen: 'up' | 'down', steadyWithin: number): Trend {
  return { current, previous, direction: compare(current, previous, goodWhen, steadyWithin) };
}

export type Quadrant = 'good' | 'lucky' | 'exposed' | 'wrong-risks';

/** Where "strong" evidence and "few" escaped defects start. The Guild sets these per tier. */
export interface QuadrantBars {
  /** Risk Coverage at or above this is high. */
  coveragePercent: number;
  /** Escaped defects per 100 releases at or below this is few. */
  escapedPer100: number;
}

/**
 * Good or lucky: reads evidence (Risk Coverage) and outcome (escaped defects) together.
 * The label starts a conversation with the team; it is never a ranking.
 */
export function quadrant(coveragePercent: number, escapedPer100: number, bars: QuadrantBars): Quadrant {
  const strong = coveragePercent >= bars.coveragePercent;
  const few = escapedPer100 <= bars.escapedPer100;
  if (strong) return few ? 'good' : 'wrong-risks';
  return few ? 'lucky' : 'exposed';
}
