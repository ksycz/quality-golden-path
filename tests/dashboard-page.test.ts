// The dashboard page shows what the deck promises, from dashboard/data.json.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderDashboard, type DashboardData } from '../dashboard/render';

const data = JSON.parse(readFileSync(new URL('../dashboard/data.json', import.meta.url), 'utf8')) as DashboardData;
const page = renderDashboard(data);
const text = page.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the dashboard page', () => {
  it('shows the four headline metrics, each with its number now', () => {
    expect(text).toContain('Change failure rate');
    expect(text).toContain('7.5% 15 of 199 releases ▲ better · was 9.9%');
    expect(text).toContain('Tier 1 escaped defects');
    expect(text).toContain('1.0 per 100 releases');
    expect(text).toContain('Feedback time');
    expect(text).toContain('13.5 min');
    expect(text).toContain('Tier 1 Risk Coverage');
    expect(text).toContain('78%');
  });

  it('says plainly which one got worse, in words and not only in colour', () => {
    expect(text).toContain('worse · was 8.5 min in the 4 weeks before');
    expect(text.match(/▲ better/g)).toHaveLength(3);
  });

  it('always has a filled "What isn’t working" box', () => {
    expect(text).toContain('What isn’t working');
    expect(text).toContain(data.whatIsntWorking[0]);
  });

  it('labels every team on the good or lucky chart, with its box in the hover text', () => {
    expect(page).toContain('Fremen: Risk Coverage 82%, 0.4 escaped per 100 releases (Good)');
    expect(page).toContain('House Atreides: Risk Coverage 79%, 2.1 escaped per 100 releases (Wrong risks)');
  });

  it('plots 4-week windows, so the last point of each chart is the number above it', () => {
    expect(page).toContain('<title>4 weeks to 23 Nov: 7.5%</title>');
    expect(page).toContain('<title>4 weeks to 23 Nov: 13.5 min</title>');
  });

  it('shows the counts behind each rate', () => {
    expect(text).toContain('15 of 199 releases');
    expect(text).toContain('2 defects in 199 releases');
    expect(text).toContain('31 of 40 risks');
  });

  it('says the data is synthetic', () => {
    expect(text).toContain('Synthetic data for the demo');
  });

  it('escapes text from the data file, so a name can never inject markup', () => {
    const html = renderDashboard({ ...data, teams: [{ name: '<script>x</script>', coveragePercent: 50, escapedPer100: 1 }] });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;x');
  });
});
