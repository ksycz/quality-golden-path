// Smoke tests: start the real server and check it answers. Few and fast on purpose.
// They prove the service starts and the pieces are wired together; the rules are proven by the unit tests.
// Run: npm run smoke  (Playwright starts the server; see playwright.config.ts)
import { expect, test } from '@playwright/test';

test('the service starts and reports healthy', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('RISK-TL-BOUNDARY: a transfer that reaches the limit exactly is approved', async ({ request }) => {
  const response = await request.post('/transfers/decision', { data: { amountCents: 500_000, sentTodayCents: 0 } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'approved', remainingTodayCents: 0 });
});

test('RISK-TL-PARTIAL: one cent over the limit is rejected and nothing is used up', async ({ request }) => {
  const response = await request.post('/transfers/decision', { data: { amountCents: 2, sentTodayCents: 499_999 } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents: 1 });
});

test('a broken request gets a clear 400, not a crash', async ({ request }) => {
  const response = await request.post('/transfers/decision', {
    // A Buffer is sent as is; a string would be JSON-encoded into a valid "{" string.
    data: Buffer.from('{'),
    headers: { 'content-type': 'application/json' },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'Body must be JSON' });
});
