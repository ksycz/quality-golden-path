// Unit tests for the HTTP API: routing, input checks and status codes.
// The limit rules themselves are proven in transfer-limit.test.ts; here we check the API passes them through.
import { describe, expect, it } from 'vitest';
import { createHandler, handleRequest } from '../src/transfer-api';
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

describe('the transfer page API', () => {
  // A fresh handler has its own empty day ledger.
  const page = () => createHandler();
  const send = (handler: ReturnType<typeof createHandler>, body: unknown) =>
    handler({ method: 'POST', path: '/transfers', body: JSON.stringify(body) });

  it('POST /transfers sends a transfer and remembers it for the customer', () => {
    const handler = page();
    expect(send(handler, { customer: 'ana', amount: '4000' })).toMatchObject({ status: 200, body: { status: 'approved', leftToday: '€1,000.00' } });
    expect(handler({ method: 'GET', path: '/transfers/today', body: '', query: { customer: 'ana' } })).toEqual({
      status: 200,
      body: { leftToday: '€1,000.00' },
    });
  });

  it.each`
    case                     | body                                    | error
    ${'missing customer'}    | ${{ amount: '5' }}                      | ${'customer must be 1 to 40 lowercase letters, digits or dashes'}
    ${'customer with space'} | ${{ customer: 'a b', amount: '5' }}     | ${'customer must be 1 to 40 lowercase letters, digits or dashes'}
    ${'amount as a number'}  | ${{ customer: 'ana', amount: 5 }}       | ${'amount must be text, like "25.00"'}
    ${'JSON null'}           | ${null}                                 | ${'Body must be a JSON object'}
  `('POST /transfers rejects a $case with 400', ({ body, error }) => {
    expect(send(page(), body)).toEqual({ status: 400, body: { error } });
  });

  it('POST /transfers rejects a body that is not JSON', () => {
    expect(page()({ method: 'POST', path: '/transfers', body: '{' })).toEqual({ status: 400, body: { error: 'Body must be JSON' } });
  });

  it('GET /transfers/today needs a valid customer', () => {
    expect(page()({ method: 'GET', path: '/transfers/today', body: '' })).toMatchObject({ status: 400 });
    expect(page()({ method: 'GET', path: '/transfers/today', body: '', query: { customer: 'A'.repeat(41) } })).toMatchObject({ status: 400 });
  });

  it('accepts a customer id of exactly 40 characters', () => {
    expect(page()({ method: 'GET', path: '/transfers/today', body: '', query: { customer: 'a'.repeat(40) } })).toMatchObject({ status: 200 });
  });

  it.each`
    method    | path
    ${'GET'}  | ${'/transfers'}
    ${'POST'} | ${'/transfers/today'}
  `('$method $path is not allowed', ({ method, path }) => {
    expect(page()({ method, path, body: '' })).toEqual({ status: 405, body: { error: 'Method not allowed' } });
  });
});
