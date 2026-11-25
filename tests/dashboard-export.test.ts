// metrics.json carries the page's numbers to other tools, so it must say exactly what the page says.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exportMetrics } from '../dashboard/export';
import type { DashboardData } from '../dashboard/render';

const data = JSON.parse(readFileSync(new URL('../dashboard/data.json', import.meta.url), 'utf8')) as DashboardData;
const metrics = exportMetrics(data);

describe('the metrics export', () => {
  it('has the four headline numbers, with the words that say which way is better', () => {
    expect(metrics.headlines.map((h) => [h.name, h.shown, h.direction])).toEqual([
      ['Change failure rate', '7.5%', 'better'],
      ['Tier 1 escaped defects', '1.0 per 100 releases', 'better'],
      ['Feedback time', '13.5 min', 'worse'],
      ['Tier 1 Risk Coverage', '78%', 'better'],
    ]);
    expect(metrics.headlines[2]!.change).toBe('▼ worse · was 8.5 min in the 4 weeks before');
    expect(metrics.headlines[0]!.counts).toBe('15 of 199 releases');
  });

  it('ends its 4-week windows on the headline numbers, so a chart of them ends where the page does', () => {
    const last = metrics.windows.at(-1)!;
    expect(last.week).toBe('2026-11-23');
    expect([last.changeFailureRate, last.escapedPer100Releases, last.feedbackMinutes, last.riskCoverage])
      .toEqual(metrics.headlines.map((h) => h.value));
    expect(metrics.windows).toHaveLength(data.weeks.length - 3);
  });

  it('gives each window a timestamp a time-series tool can plot', () => {
    expect(metrics.windows[0]!.time).toBe(Date.UTC(2026, 8, 28));
  });

  it('puts each team in its box by the same rule as the page', () => {
    expect(metrics.teams.map((t) => [t.name, t.box])).toEqual([
      ['Fremen', 'Good'], ['Sardaukar', 'Lucky'], ['House Harkonnen', 'Exposed'], ['House Atreides', 'Wrong risks'],
    ]);
  });

  it('keeps the "What isn’t working" box', () => {
    expect(metrics.whatIsntWorking).toEqual(data.whatIsntWorking);
  });
});
