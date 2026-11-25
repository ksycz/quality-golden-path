// HTTP API for the daily transfer limit: turns a request into a response, with no network code.
// src/server.ts puts it on a port; keeping the two apart lets plain unit tests cover every rule here.
import { decideTransfer } from './transfer-limit.ts';

export interface ApiRequest {
  method: string;
  path: string;
  /** The raw request body, as text. */
  body: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

/** Answers one request. Never throws: every failure becomes a 4xx response. */
export function handleRequest({ method, path, body }: ApiRequest): ApiResponse {
  if (path === '/health') {
    return method === 'GET' ? { status: 200, body: { status: 'ok' } } : methodNotAllowed();
  }
  if (path === '/transfers/decision') {
    return method === 'POST' ? decide(body) : methodNotAllowed();
  }
  return { status: 404, body: { error: 'Not found' } };
}

// POST /transfers/decision with {"amountCents": 1000, "sentTodayCents": 0}, optionally "dailyLimitCents".
function decide(body: string): ApiResponse {
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return badRequest('Body must be JSON');
  }
  if (typeof input !== 'object' || input === null) return badRequest('Body must be a JSON object');

  const { amountCents, sentTodayCents, dailyLimitCents } = input as Record<string, unknown>;
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
