// Builds the dashboard into site/index.html: one static file you can open from disk or serve on GitHub Pages.
// Run: npm run dashboard
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderDashboard, type DashboardData } from './render.ts';

const data = JSON.parse(readFileSync(new URL('data.json', import.meta.url), 'utf8')) as DashboardData;
const out = new URL('../site/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('index.html', out), renderDashboard(data));
console.log(`Dashboard written to ${new URL('index.html', out).pathname}`);
