// The dashboard page: one static HTML file with inline styles and SVG charts, no JavaScript.
// The numbers and the rules that read them come from src/dashboard-metrics.ts; this file only lays them out.
import {
  changeFailureRate, escapedPer100Releases, feedbackTime, quadrant, riskCoverage,
  WINDOW_WEEKS, type Quadrant, type QuadrantBars, type Trend, type Week,
} from '../src/dashboard-metrics.ts';

export interface Diagnostics {
  mutationScore: number;
  flakyRate: number;
  pipelineMinutes: number;
  ciCostPerMergeEur: number;
  openWaivers: number;
  /** Share of Tier 1 repos on the current version of the Guide, in percent. */
  guideAdoption: number;
}

export interface DashboardData {
  note: string;
  scope: string;
  events: { week: string; label: string }[];
  bars: QuadrantBars;
  weeks: (Week & { diagnostics: Diagnostics })[];
  teams: { name: string; coveragePercent: number; escapedPer100: number }[];
  whatIsntWorking: string[];
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const day = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const fixed = (value: number | null, digits: number) => (value === null ? 'n/a' : value.toFixed(digits));

export interface Headline {
  tag: string;
  name: string;
  what: string;
  unit: (v: number | null) => string;
  trend: Trend;
  /** The raw counts behind a rate, so a small number is never hidden behind a percentage. */
  counts: string;
  /** The headline value for each 4-week window ending in that week, from the same function as the headline. */
  rolling: (number | null)[];
}

const sum = (weeks: Week[], pick: (w: Week) => number) => weeks.reduce((total, w) => total + pick(w), 0);

export function headlines(weeks: Week[]): Headline[] {
  const last = weeks.slice(-WINDOW_WEEKS);
  // Window i is the 4 weeks ending in week i; the first full window ends in week 4.
  const roll = (metric: (ws: Week[]) => Trend) =>
    weeks.slice(WINDOW_WEEKS - 1).map((_, i) => metric(weeks.slice(0, i + WINDOW_WEEKS)).current);
  const releases = sum(last, (w) => w.releases);
  const lastWeek = weeks.at(-1);
  return [
    {
      tag: 'Stability', name: 'Change failure rate', what: 'Releases that caused a rollback, hotfix or incident',
      unit: (v) => `${fixed(v, 1)}%`, trend: changeFailureRate(weeks), rolling: roll(changeFailureRate),
      counts: `${sum(last, (w) => w.failedReleases)} of ${releases} releases`,
    },
    {
      tag: 'Stability', name: 'Tier 1 escaped defects', what: 'Money, identity and access bugs found in production',
      unit: (v) => `${fixed(v, 1)} per 100 releases`, trend: escapedPer100Releases(weeks), rolling: roll(escapedPer100Releases),
      counts: `${sum(last, (w) => w.tier1Escaped)} defects in ${releases} releases`,
    },
    {
      tag: 'Speed', name: 'Feedback time', what: 'Median time from PR opened to evidence ready',
      unit: (v) => `${fixed(v, 1)} min`, trend: feedbackTime(weeks), rolling: roll(feedbackTime),
      counts: 'average of the weekly medians',
    },
    {
      tag: 'Strength', name: 'Tier 1 Risk Coverage', what: 'Listed Tier 1 risks with a test that kills its mutants',
      unit: (v) => `${fixed(v, 0)}%`, trend: riskCoverage(weeks), rolling: roll(riskCoverage),
      counts: lastWeek ? `${lastWeek.risksCovered} of ${lastWeek.risksListed} risks` : '',
    },
  ];
}

export const DIRECTION = {
  better: { icon: '▲', label: 'better', css: 'good' },
  worse: { icon: '▼', label: 'worse', css: 'bad' },
  steady: { icon: '●', label: 'steady', css: 'steady' },
} as const;

/**
 * The headline value over time: one point per 4-week window, so the last point is the number above it.
 * The event is marked. Hover a point for its value.
 */
function lineChart(h: Headline, allWeeks: Week[], events: DashboardData['events']): string {
  const W = 320, H = 120, left = 8, right = 8, top = 12, bottom = 22;
  const weeks = allWeeks.slice(WINDOW_WEEKS - 1);
  const values = h.rolling.map((v) => v ?? 0);
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = (hi - lo) * 0.15 || 1;
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const x = (i: number) => left + (i * (W - left - right)) / (weeks.length - 1);
  const y = (v: number) => top + ((y1 - v) * (H - top - bottom)) / (y1 - y0);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const marks = events.map((e) => {
    const i = weeks.findIndex((w) => w.week === e.week);
    return i < 0 ? '' : `<line class="event" x1="${x(i)}" x2="${x(i)}" y1="${top - 6}" y2="${H - bottom}"/>`;
  }).join('');
  const dots = values.map((v, i) =>
    `<g class="pt"><circle class="hit" cx="${x(i)}" cy="${y(v)}" r="9"/><circle class="dot" cx="${x(i)}" cy="${y(v)}" r="4"/>` +
    `<title>4 weeks to ${day(weeks[i]!.week)}: ${escape(h.unit(h.rolling[i] ?? null))}</title></g>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(h.name)}, each 4-week window from ${day(weeks[0]!.week)} to ${day(weeks.at(-1)!.week)}">
<line class="base" x1="${left}" x2="${W - right}" y1="${H - bottom}" y2="${H - bottom}"/>${marks}
<polyline class="line" points="${points}"/>${dots}
<text class="axis" x="${left}" y="${H - 4}">${day(weeks[0]!.week)}</text>
<text class="axis" x="${W - right}" y="${H - 4}" text-anchor="end">${day(weeks.at(-1)!.week)}</text></svg>`;
}

/** "13.5 min" → a big "13.5" and a small " min", so long units don't wrap the headline number. */
function bigNumber(text: string): string {
  const space = text.indexOf(' ');
  return space < 0 ? escape(text) : `${escape(text.slice(0, space))}<span class="unit">${escape(text.slice(space))}</span>`;
}

function tile(h: Headline, data: DashboardData): string {
  const d = DIRECTION[h.trend.direction];
  return `<article class="tile">
<p class="tag">${h.tag}</p><h3>${h.name}</h3><p class="what">${h.what}</p>
<p class="value">${bigNumber(h.unit(h.trend.current))}</p><p class="counts">${escape(h.counts)}</p>
<p class="delta ${d.css}"><span aria-hidden="true">${d.icon}</span> ${d.label} · was ${escape(h.unit(h.trend.previous))} in the 4 weeks before</p>
${lineChart(h, data.weeks, data.events)}
</article>`;
}

export const BOX: Record<Quadrant, { label: string; next: string }> = {
  good: { label: 'Good', next: 'Evidence and outcome agree.' },
  lucky: { label: 'Lucky', next: 'Nothing has broken yet. Strengthen the tests first.' },
  exposed: { label: 'Exposed', next: 'Start here, with a pilot or support.' },
  'wrong-risks': { label: 'Wrong risks', next: 'Tests protect the wrong things. Revisit the risk list.' },
};

/** Risk Coverage across, escaped defects up, the bars as lines. Teams are labelled, never ranked. */
function goodOrLucky(data: DashboardData): string {
  const W = 640, H = 400, left = 56, right = 24, top = 24, bottom = 48;
  const maxEscaped = Math.max(3, ...data.teams.map((t) => t.escapedPer100));
  const x = (c: number) => left + (c / 100) * (W - left - right);
  const y = (e: number) => top + ((maxEscaped - e) / maxEscaped) * (H - top - bottom);
  const corner = (q: Quadrant, cx: number, cy: number, anchor: string) =>
    `<text class="box" x="${cx}" y="${cy}" text-anchor="${anchor}">${BOX[q].label.toUpperCase()}</text>`;
  const teams = data.teams.map((t) => {
    const q = quadrant(t.coveragePercent, t.escapedPer100, data.bars);
    return `<g class="pt"><circle class="dot" cx="${x(t.coveragePercent)}" cy="${y(t.escapedPer100)}" r="7"/>` +
      `<text class="label" x="${x(t.coveragePercent) + 12}" y="${y(t.escapedPer100) + 5}">${escape(t.name)}</text>` +
      `<title>${escape(t.name)}: Risk Coverage ${t.coveragePercent}%, ${t.escapedPer100} escaped per 100 releases (${BOX[q].label})</title></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Teams by Risk Coverage and escaped defects">
<line class="base" x1="${left}" x2="${W - right}" y1="${H - bottom}" y2="${H - bottom}"/>
<line class="base" x1="${left}" x2="${left}" y1="${top}" y2="${H - bottom}"/>
<line class="bar" x1="${x(data.bars.coveragePercent)}" x2="${x(data.bars.coveragePercent)}" y1="${top}" y2="${H - bottom}"/>
<line class="bar" x1="${left}" x2="${W - right}" y1="${y(data.bars.escapedPer100)}" y2="${y(data.bars.escapedPer100)}"/>
<text class="axis" x="${x(data.bars.coveragePercent) + 6}" y="${H - bottom - 30}">${data.bars.coveragePercent}% bar</text>
<text class="axis" x="${W - right - 10}" y="${y(data.bars.escapedPer100) - 6}" text-anchor="end">${data.bars.escapedPer100} per 100 bar</text>
${corner('exposed', left + 10, top + 16, 'start')}${corner('wrong-risks', W - right - 10, top + 16, 'end')}
${corner('lucky', left + 10, H - bottom - 10, 'start')}${corner('good', W - right - 10, H - bottom - 10, 'end')}
${teams}
<text class="axis" x="${(left + W - right) / 2}" y="${H - 12}" text-anchor="middle">Tier 1 Risk Coverage, % →</text>
<text class="axis" transform="translate(16 ${(top + H - bottom) / 2}) rotate(-90)" text-anchor="middle">Escaped defects per 100 releases →</text>
<text class="axis" x="${left - 6}" y="${H - bottom + 18}" text-anchor="end">0</text>
<text class="axis" x="${W - right}" y="${H - bottom + 18}" text-anchor="end">100</text></svg>`;
}

function diagnostics(data: DashboardData): string {
  const now = data.weeks.at(-1)!.diagnostics, before = data.weeks.at(-5)!.diagnostics;
  const rows: [string, keyof Diagnostics, (v: number) => string][] = [
    ['Mutation score, nightly', 'mutationScore', (v) => `${v}%`],
    ['Flaky test rate', 'flakyRate', (v) => `${v.toFixed(1)}%`],
    ['Pipeline duration, median', 'pipelineMinutes', (v) => `${v} min`],
    ['CI cost per merge', 'ciCostPerMergeEur', (v) => `€${v.toFixed(2)}`],
    ['Open waivers', 'openWaivers', (v) => String(v)],
    ['Guide adoption, Tier 1 repos on the current Guide', 'guideAdoption', (v) => `${v}%`],
  ];
  return rows.map(([name, key, show]) => `<tr><th scope="row">${name}</th><td>${show(before[key])}</td><td>${show(now[key])}</td></tr>`).join('') +
    '<tr><th scope="row">AI Advisor acted-on rate</th><td colspan="2">Not running yet: the Advisor starts in Trial in Q3</td></tr>';
}

function weeklyTable(data: DashboardData, hs: Headline[]): string {
  const head = hs.map((h) => `<th scope="col">${h.name}</th>`).join('');
  const rows = data.weeks.slice(WINDOW_WEEKS - 1).map((w, i) =>
    `<tr><th scope="row">${day(w.week)}</th>${hs.map((h) => `<td>${escape(h.unit(h.rolling[i] ?? null))}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr><th scope="col">4 weeks to</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderDashboard(data: DashboardData): string {
  const hs = headlines(data.weeks);
  const last = data.weeks.at(-1)!.week;
  const event = data.events[0];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quality dashboard</title>
<style>
:root { color-scheme: light; --bg:#f4f2ec; --card:#fbfaf6; --ink:#1c1f24; --muted:#52514e; --line:#d3cfc4; --series:#2a78d6;
  --good:#006300; --bad:#b42727; --accent:#8f5b00; --accent-bg:#fbefd5; }
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --bg:#1a1a19; --card:#232321; --ink:#f0efec; --muted:#c3c2b7;
  --line:#3a3a37; --series:#3987e5; --good:#4cc24c; --bad:#ee7a7a; --accent:#f2b035; --accent-bg:#2e2615; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:1200px; margin:0 auto; padding:24px 16px 48px; }
h1 { font-size:28px; margin:0 0 4px; } h2 { font-size:20px; margin:40px 0 12px; } h3 { font-size:17px; margin:0; }
.sub, .what, .axis-note, footer { color:var(--muted); }
.note { display:inline-block; margin:8px 0 0; padding:4px 10px; border:1px solid var(--line); border-radius:6px; font-size:14px; color:var(--muted); }
.tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:16px; margin-top:24px; }
.tile { display:flex; flex-direction:column; } .tile svg { margin-top:auto; }
.tile, .box-card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; }
.tag { margin:0; font-size:13px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--accent); }
.what { margin:2px 0 8px; font-size:14px; }
.value { margin:0; font-size:32px; font-weight:650; } .unit { font-size:16px; font-weight:500; color:var(--muted); }
.counts { margin:0; font-size:13px; color:var(--muted); }
.delta { margin:4px 0 8px; font-size:14px; font-weight:600; } .good { color:var(--good); } .bad { color:var(--bad); } .steady { color:var(--muted); }
svg { width:100%; height:auto; display:block; overflow:visible; }
.line { fill:none; stroke:var(--series); stroke-width:2; } .dot { fill:var(--series); stroke:var(--card); stroke-width:2; }
.hit { fill:transparent; } .pt:hover .dot { r:6; }
.base { stroke:var(--line); stroke-width:1; } .event, .bar { stroke:var(--muted); stroke-width:1; stroke-dasharray:4 4; }
.axis { fill:var(--muted); font-size:12px; } .label { fill:var(--ink); font-size:14px; font-weight:600; }
.box { fill:var(--muted); font-size:12px; font-weight:700; letter-spacing:.08em; }
.worse-box { margin-top:24px; background:var(--accent-bg); border-left:4px solid var(--accent); border-radius:6px; padding:16px 20px; }
.worse-box h2 { margin:0 0 8px; } .worse-box p { margin:0 0 8px; }
.two { display:grid; grid-template-columns:minmax(0, 3fr) minmax(0, 2fr); gap:24px; align-items:start; }
@media (max-width: 760px) { .two { grid-template-columns:1fr; } }
.boxes { display:grid; gap:8px; } .box-card p { margin:0; font-size:14px; } .box-card b { font-size:13px; letter-spacing:.06em; }
table { width:100%; border-collapse:collapse; font-size:14px; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); } td { text-align:right; }
thead th { color:var(--muted); font-weight:600; text-align:right; } thead th:first-child { text-align:left; } .scroll { overflow-x:auto; }
details { margin-top:16px; } summary { cursor:pointer; color:var(--muted); }
footer { margin-top:48px; font-size:14px; } a { color:var(--series); }
</style></head>
<body><main>
<h1>Quality dashboard</h1>
<p class="sub">${escape(data.scope)} · weeks to ${day(last)} 2026 · the last 4 weeks against the 4 before</p>
<p class="note">${escape(data.note)}</p>

<section class="tiles" aria-label="Headline metrics">${hs.map((h) => tile(h, data)).join('')}</section>
<p class="axis-note">Each point is the 4 weeks to that date, the same window as the number above it.${event ? ` Dashed line: ${escape(event.label)}, week of ${day(event.week)}.` : ''}</p>

<section class="worse-box" aria-labelledby="worse"><h2 id="worse">What isn’t working</h2>
${data.whatIsntWorking.map((p) => `<p>${escape(p)}</p>`).join('')}</section>

<h2>Good or lucky?</h2>
<p class="sub">Few incidents can mean a team is good or just lucky. Risk Coverage and escaped defects read together tell which. The boxes start a conversation; they are never a ranking.</p>
<div class="two">${goodOrLucky(data)}
<div class="boxes">${(['good', 'lucky', 'exposed', 'wrong-risks'] as const).map((q) =>
  `<div class="box-card"><b>${BOX[q].label.toUpperCase()}</b><p>${BOX[q].next}</p></div>`).join('')}</div></div>

<h2>Diagnostics</h2>
<p class="sub">Not for leadership. They explain a headline number when it moves.</p>
<div class="scroll"><table><thead><tr><th scope="col">Diagnostic</th><th scope="col">4 weeks before</th><th scope="col">Last week</th></tr></thead>
<tbody>${diagnostics(data)}</tbody></table></div>

<details><summary>Every 4-week window, as a table</summary><div class="scroll">${weeklyTable(data, hs)}</div></details>

<footer>Built from <code>dashboard/data.json</code> by <code>npm run dashboard</code>. Definitions: <code>src/dashboard-metrics.ts</code>.
Source: <a href="https://github.com/ksycz/quality-golden-path">github.com/ksycz/quality-golden-path</a></footer>
</main></body></html>
`;
}
