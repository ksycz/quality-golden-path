// The headline metrics and the "good or lucky" view. Definitions come from the deck and the
// prep notes: escaped defects per 100 releases, 4-week windows, small changes count as steady.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  changeFailureRate, compare, escapedPer100Releases, feedbackTime, percent, quadrant, riskCoverage, type Week,
} from '../src/dashboard-metrics';

const week = (overrides: Partial<Week> = {}): Week => ({
  week: '2026-01-05', releases: 10, failedReleases: 0, tier1Escaped: 0, feedbackMinutes: 10,
  risksListed: 10, risksCovered: 5, ...overrides,
});
/** 4 weeks like `before`, then 4 weeks like `after`. */
const eightWeeks = (before: Partial<Week>, after: Partial<Week>) => [
  ...Array.from({ length: 4 }, () => week(before)),
  ...Array.from({ length: 4 }, () => week(after)),
];

describe('percent', () => {
  it('is the share in percent', () => expect(percent(1, 4)).toBe(25));
  it('is null when there is nothing to divide by', () => expect(percent(0, 0)).toBeNull());
});

describe('compare: better, worse or steady', () => {
  it.each`
    current | previous | goodWhen  | direction
    ${12}   | ${10}    | ${'up'}   | ${'better'}
    ${8}    | ${10}    | ${'up'}   | ${'worse'}
    ${8}    | ${10}    | ${'down'} | ${'better'}
    ${12}   | ${10}    | ${'down'} | ${'worse'}
    ${11}   | ${10}    | ${'up'}   | ${'steady'}
    ${9}    | ${10}    | ${'down'} | ${'steady'}
    ${null} | ${10}    | ${'up'}   | ${'steady'}
    ${10}   | ${null}  | ${'up'}   | ${'steady'}
  `('$previous → $current, good when $goodWhen: $direction', ({ current, previous, goodWhen, direction }) => {
    expect(compare(current, previous, goodWhen, 1)).toBe(direction);
  });

  it('a change just over the steady band counts', () => {
    expect(compare(11.01, 10, 'up', 1)).toBe('better');
  });
});

describe('change failure rate: failed releases out of all releases, last 4 weeks vs the 4 before', () => {
  it('weights by releases, so a busy week counts more than a quiet one', () => {
    const weeks = [
      ...Array.from({ length: 4 }, () => week()),
      week({ releases: 30, failedReleases: 3 }), week({ releases: 10, failedReleases: 1 }),
      week({ releases: 10, failedReleases: 0 }), week({ releases: 50, failedReleases: 1 }),
    ];
    expect(changeFailureRate(weeks)).toEqual({ current: 5, previous: 0, direction: 'worse' });
  });

  it('fewer failed releases is better', () => {
    expect(changeFailureRate(eightWeeks({ failedReleases: 2 }, { failedReleases: 1 })).direction).toBe('better');
  });

  it('with no releases there is no rate', () => {
    expect(changeFailureRate(eightWeeks({ releases: 0 }, { releases: 0 }))).toEqual({ current: null, previous: null, direction: 'steady' });
  });
});

describe('Tier 1 escaped defects per 100 releases', () => {
  it('more releases with the same defects is fewer per 100, so better', () => {
    expect(escapedPer100Releases(eightWeeks({ releases: 10, tier1Escaped: 1 }, { releases: 20, tier1Escaped: 1 })))
      .toEqual({ current: 5, previous: 10, direction: 'better' });
  });

  it('a change of 0.2 per 100 or less is steady', () => {
    expect(escapedPer100Releases(eightWeeks({ releases: 500, tier1Escaped: 1 }, { releases: 500, tier1Escaped: 2 })).direction)
      .toBe('steady');
  });
});

describe('feedback time: average of the weekly medians', () => {
  it('waiting longer is worse', () => {
    expect(feedbackTime(eightWeeks({ feedbackMinutes: 8 }, { feedbackMinutes: 14 })))
      .toEqual({ current: 14, previous: 8, direction: 'worse' });
  });

  it('with fewer than 8 weeks the earlier window is shorter, and with none there is no value', () => {
    expect(feedbackTime([week({ feedbackMinutes: 7 })])).toEqual({ current: 7, previous: null, direction: 'steady' });
  });
});

describe('Tier 1 Risk Coverage: at the end of each window', () => {
  it('uses the last week of each window, not an average', () => {
    const weeks = eightWeeks({ risksCovered: 1 }, { risksCovered: 1 });
    weeks[3] = week({ risksCovered: 4 });
    weeks[7] = week({ risksCovered: 8 });
    expect(riskCoverage(weeks)).toEqual({ current: 80, previous: 40, direction: 'better' });
  });

  it('with no weeks there is nothing to show', () => {
    expect(riskCoverage([])).toEqual({ current: null, previous: null, direction: 'steady' });
  });
});

describe('good or lucky: Risk Coverage and escaped defects read together', () => {
  const bars = { coveragePercent: 70, escapedPer100: 1 };
  it.each`
    coverage | escaped | label
    ${70}    | ${1}    | ${'good'}
    ${69.9}  | ${1}    | ${'lucky'}
    ${70}    | ${1.01} | ${'wrong-risks'}
    ${69.9}  | ${1.01} | ${'exposed'}
  `('coverage $coverage%, $escaped per 100 releases: $label', ({ coverage, escaped, label }) => {
    expect(quadrant(coverage, escaped, bars)).toBe(label);
  });
});

describe('the demo data tells the story the deck promises', () => {
  const data = JSON.parse(readFileSync(new URL('../dashboard/data.json', import.meta.url), 'utf8'));

  it('three headline metrics improve and feedback time gets worse', () => {
    expect([changeFailureRate, escapedPer100Releases, feedbackTime, riskCoverage].map((m) => m(data.weeks).direction))
      .toEqual(['better', 'better', 'worse', 'better']);
  });

  it('each team lands in a different box, so the page shows all four', () => {
    const labels = data.teams.map((t: { coveragePercent: number; escapedPer100: number }) =>
      quadrant(t.coveragePercent, t.escapedPer100, data.bars));
    expect(new Set(labels).size).toBe(4);
  });
});
