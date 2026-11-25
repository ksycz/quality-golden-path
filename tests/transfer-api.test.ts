// Unit tests for the HTTP API: routing, input checks and status codes.
// The limit rules themselves are proven in transfer-limit.test.ts; here we check the API passes them through.
import { describe, expect, it } from 'vitest';
import { handleRequest } from '../src/transfer-api';
import { eur } from './money';

const post = (body: unknown) =>
  handleRequest({ method: 'POST', path: '/transfers/decision', body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('GET /health', () => {
  it('answers ok', () => {
    expect(handleRequest({ method: 'GET', path: '/health', body: '' })).toEqual({ status: 200, body: { status: 'ok' } });
  });

  it('refuses other methods', () => {
    expect(handleRequest({ method: 'POST', path: '/health', body: '' })).toEqual({ status: 405, body: { error: 'Method not allowed' } });
  });
});

describe('POST /transfers/decision', () => {
  it('RISK-TL-BOUNDARY: approves a transfer that reaches the limit exactly', () => {
    expect(post({ amountCents: eur(5000), sentTodayCents: 0 })).toEqual({
      status: 200,
      body: { status: 'approved', remainingTodayCents: 0 },
    });
  });

  it('RISK-TL-PARTIAL: a rejection is a 200 answer with the reason and the unchanged amount left', () => {
    expect(post({ amountCents: eur(0.02), sentTodayCents: eur(4999.99) })).toEqual({
      status: 200,
      body: { status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents: eur(0.01) },
    });
  });

  it('uses the customer limit when one is sent', () => {
    expect(post({ amountCents: eur(100), sentTodayCents: 0, dailyLimitCents: eur(50) })).toEqual({
      status: 200,
      body: { status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents: eur(50) },
    });
  });

  it.each`
    case                          | body                                                          | error
    ${'body that is not JSON'}    | ${'{'}                                                        | ${'Body must be JSON'}
    ${'JSON null'}                | ${'null'}                                                     | ${'Body must be a JSON object'}
    ${'JSON number'}              | ${'5'}                                                        | ${'Body must be a JSON object'}
    ${'missing amount'}           | ${{ sentTodayCents: 0 }}                                      | ${'amountCents and sentTodayCents must be numbers'}
    ${'amount as text'}           | ${{ amountCents: '100', sentTodayCents: 0 }}                  | ${'amountCents and sentTodayCents must be numbers'}
    ${'missing day total'}        | ${{ amountCents: 100 }}                                       | ${'amountCents and sentTodayCents must be numbers'}
    ${'limit as text'}            | ${{ amountCents: 100, sentTodayCents: 0, dailyLimitCents: 'x' }} | ${'dailyLimitCents must be a number'}
    ${'negative day total'}       | ${{ amountCents: 100, sentTodayCents: -1 }}                   | ${'sentTodayCents must be a whole number of cents, zero or more'}
  `('rejects a $case with 400', ({ body, error }) => {
    expect(post(body)).toEqual({ status: 400, body: { error } });
  });

  it('refuses other methods', () => {
    expect(handleRequest({ method: 'GET', path: '/transfers/decision', body: '' }).status).toBe(405);
  });
});

it('answers 404 for an unknown path', () => {
  expect(handleRequest({ method: 'GET', path: '/nope', body: '' })).toEqual({ status: 404, body: { error: 'Not found' } });
});
