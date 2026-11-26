// The same numbers as the page, as JSON for other dashboard tools such as Grafana.
// Everything is computed here, from src/dashboard-metrics.ts, so a tool that reads this file only plots it
// and can't disagree with the page.
import { quadrant, WINDOW_WEEKS } from '../src/dashboard-metrics.ts';
import { BOX, DIRECTION, headlines, type DashboardData, type Diagnostics } from './render.ts';

export interface MetricsExport {
  note: string;
  scope: string;
  /** The four headline numbers for the last 4 weeks, with the words that say which way is better. */
  headlines: {
    tag: string; name: string; what: string;
    value: number | null; previous: number | null; shown: string; counts: string;
    direction: 'better' | 'worse' | 'steady'; change: string;
  }[];
  /** One row per 4-week window, named by its last week. `time` is milliseconds since 1970, for time-series tools. */
  windows: ({
    week: string; time: number;
    changeFailureRate: number | null; escapedPer100Releases: number | null;
    feedbackMinutes: number | null; riskCoverage: number | null;
  } & Diagnostics)[];
  teams: { name: string; coveragePercent: number; escapedPer100: number; box: string; next: string }[];
  bars: DashboardData['bars'];
  events: DashboardData['events'];
  whatIsntWorking: string[];
}

export function exportMetrics(data: DashboardData): MetricsExport {
  const hs = headlines(data.weeks);
  const [cfr, escaped, feedback, coverage] = hs.map((h) => h.rolling);
  return {
    note: data.note,
    scope: data.scope,
    headlines: hs.map((h) => {
      const d = DIRECTION[h.trend.direction];
      return {
        tag: h.tag, name: h.name, what: h.what,
        value: h.trend.current, previous: h.trend.previous, shown: h.unit(h.trend.current), counts: h.counts,
        direction: h.trend.direction, change: `${d.icon} ${d.label} · was ${h.unit(h.trend.previous)} in the 4 weeks before`,
      };
    }),
    windows: data.weeks.slice(WINDOW_WEEKS - 1).map((w, i) => ({
      week: w.week, time: Date.parse(`${w.week}T00:00:00Z`),
      changeFailureRate: cfr![i] ?? null, escapedPer100Releases: escaped![i] ?? null,
      feedbackMinutes: feedback![i] ?? null, riskCoverage: coverage![i] ?? null,
      ...w.diagnostics,
    })),
    teams: data.teams.map((t) => {
      const box = BOX[quadrant(t.coveragePercent, t.escapedPer100, data.bars)];
      return { ...t, box: box.label, next: box.next };
    }),
    bars: data.bars,
    events: data.events,
    whatIsntWorking: data.whatIsntWorking,
  };
}
