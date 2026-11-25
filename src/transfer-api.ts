// HTTP API for the daily transfer limit: turns a request into a response, with no network code.
// src/server.ts puts it on a port; keeping the two apart lets plain unit tests cover every rule here.
import { createDayLedger, type DayLedger } from './day-ledger.ts';
import { leftToday, sendTransfer } from './send-transfer.ts';
import { decideTransfer } from './transfer-limit.ts';

export interface ApiRequest {
  method: string;
  path: string;
  /** The raw request body, as text. */
  body: string;
  /** Query string values, e.g. { customer: 'demo' } for ?customer=demo. */
  query?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

/**
 * Builds the request handler around a day ledger, the record of what each customer sent today.
 * Each call gets its own ledger, so tests never share state. The handler never throws:
 * every failure becomes a 4xx response.
 */
export function createHandler(ledger: DayLedger = createDayLedger()) {
  return ({ method, path, body, query = {} }: ApiRequest): ApiResponse => {
    if (path === '/health') {
      return method === 'GET' ? { status: 200, body: { status: 'ok' } } : methodNotAllowed();
    }
    if (path === '/transfers/decision') {
      return method === 'POST' ? decide(body) : methodNotAllowed();
    }
    // The transfer page: send a transfer, and read what is left today.
    if (path === '/transfers') {
      return method === 'POST' ? send(ledger, body) : methodNotAllowed();
    }
    if (path === '/transfers/today') {
      if (method !== 'GET') return methodNotAllowed();
      const customer = query.customer ?? '';
      return isCustomerId(customer) ? { status: 200, body: { leftToday: leftToday(ledger, customer) } } : badRequest(CUSTOMER_ERROR);
    }
    return { status: 404, body: { error: 'Not found' } };
  };
}

/** The handler the decision tests use: a fresh ledger, no customers yet. */
export const handleRequest = createHandler();

// Customer ids come from the page's URL, so only short, plain ids are accepted.
const isCustomerId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value);
const CUSTOMER_ERROR = 'customer must be 1 to 40 lowercase letters, digits or dashes';

// POST /transfers with {"customer": "demo", "amount": "25.00"}: the amount as the customer typed it.
function send(ledger: DayLedger, body: string): ApiResponse {
  const input = parseObject(body);
  if (typeof input === 'string') return badRequest(input);
  const { customer, amount } = input;
  if (!isCustomerId(customer)) return badRequest(CUSTOMER_ERROR);
  if (typeof amount !== 'string') return badRequest('amount must be text, like "25.00"');
  // A rejected transfer is still a successful answer: 200, with the reason and message in the body.
  return { status: 200, body: sendTransfer(ledger, customer, amount) };
}

// The body as a JSON object, or the error message to send back.
function parseObject(body: string): Record<string, unknown> | string {
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return 'Body must be JSON';
  }
  if (typeof input !== 'object' || input === null) return 'Body must be a JSON object';
  return input as Record<string, unknown>;
}

// POST /transfers/decision with {"amountCents": 1000, "sentTodayCents": 0}, optionally "dailyLimitCents".
function decide(body: string): ApiResponse {
  const input = parseObject(body);
  if (typeof input === 'string') return badRequest(input);
  const { amountCents, sentTodayCents, dailyLimitCents } = input;
  if (typeof amountCents !== 'number' || typeof sentTodayCents !== 'number') {
    return badRequest('amountCents and sentTodayCents must be numbers');
  }
  if (dailyLimitCents !== undefined && typeof dailyLimitCents !== 'number') {
    return badRequest('dailyLimitCents must be a number');
  }

  try {
    const decision = decideTransfer(
      dailyLimitCents === undefined ? { amountCents, sentTodayCents } : { amountCents, sentTodayCents, dailyLimitCents },
    );
    // A rejected transfer is still a successful answer: 200, with the reason in the body.
    return { status: 200, body: decision };
  } catch (error) {
    // decideTransfer throws RangeError for a bad limit or day total: the caller's mistake, so 400.
    if (error instanceof RangeError) return badRequest(error.message);
    throw error;
  }
}

const badRequest = (error: string): ApiResponse => ({ status: 400, body: { error } });
const methodNotAllowed = (): ApiResponse => ({ status: 405, body: { error: 'Method not allowed' } });
