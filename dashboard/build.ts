// Builds the dashboard into site/: index.html, one static page you can open from disk or serve on GitHub Pages,
// and metrics.json, the same numbers for other dashboard tools.
// Run: npm run dashboard
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { exportMetrics } from './export.ts';
import { renderDashboard, type DashboardData } from './render.ts';

const data = JSON.parse(readFileSync(new URL('data.json', import.meta.url), 'utf8')) as DashboardData;
const out = new URL('../site/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('index.html', out), renderDashboard(data));
writeFileSync(new URL('metrics.json', out), `${JSON.stringify(exportMetrics(data), null, 2)}\n`);
console.log(`Dashboard written to ${new URL('index.html', out).pathname} and metrics.json`);
