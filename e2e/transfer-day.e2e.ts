// End-to-end tests: a customer's day on the transfer page, in a real browser against the real server.
// They prove what the customer sees for each Tier 1 risk; the rules themselves are proven by the unit tests.
// Run: npm run e2e  (Playwright starts the server; see playwright.config.ts)
import { expect, test, type Page } from '@playwright/test';

// Each test is a new customer, so no two tests share a day total, even when they run in parallel.
const newCustomer = () => `c-${test.info().testId}`.slice(0, 40).toLowerCase();

async function openTransferPage(page: Page) {
  await page.goto(`/?customer=${newCustomer()}`);
  await expect(leftToday(page)).toHaveText('Left today: €5,000.00');
}

async function send(page: Page, amount: string) {
  await page.getByLabel('Amount in euros').fill(amount);
  await page.getByRole('button', { name: 'Send transfer' }).click();
}

const leftToday = (page: Page) => page.locator('p', { hasText: 'Left today' });
const answer = (page: Page) => page.getByRole('status');

test('RISK-TL-BOUNDARY: two transfers that reach the limit exactly are both sent', async ({ page }) => {
  await openTransferPage(page);
  await send(page, '3000');
  await expect(answer(page)).toHaveText('Sent €3,000.00. You can send €2,000.00 more today.');
  await send(page, '2000.00');
  await expect(answer(page)).toHaveText('Sent €2,000.00. You can send €0.00 more today.');
  await expect(leftToday(page)).toHaveText('Left today: €0.00');
});

test('RISK-TL-PARTIAL: one cent over is not sent, and the last cent can still go', async ({ page }) => {
  await openTransferPage(page);
  await send(page, '4999.99');
  await expect(leftToday(page)).toHaveText('Left today: €0.01');
  await send(page, '0.02');
  await expect(answer(page)).toHaveText('Not sent: this would go over your daily limit. You can send €0.01 more today.');
  await expect(leftToday(page)).toHaveText('Left today: €0.01');
  await send(page, '0.01');
  await expect(answer(page)).toHaveText('Sent €0.01. You can send €0.00 more today.');
});

test('RISK-TL-INVALID: an amount that is not money is not sent, and the typed text stays to fix', async ({ page }) => {
  await openTransferPage(page);
  for (const typed of ['0', '-5', '12.345']) {
    await send(page, typed);
    await expect(answer(page)).toHaveText('Not sent: enter an amount in euros, like 25.00.');
    await expect(page.getByLabel('Amount in euros')).toHaveValue(typed);
  }
  await expect(leftToday(page)).toHaveText('Left today: €5,000.00');
});

test('RISK-TL-REMAINING: what is left today is still right after reloading the page', async ({ page }) => {
  await openTransferPage(page);
  await send(page, '1250.50');
  await expect(answer(page)).toHaveText('Sent €1,250.50. You can send €3,749.50 more today.');
  await page.reload();
  await expect(leftToday(page)).toHaveText('Left today: €3,749.50');
});
