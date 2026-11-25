// Daily transfer limit: decides whether a customer may send a transfer today.
// The rules come from requirements/daily-transfer-limit.md (REQ-TL-1 to REQ-TL-5).
// All money is in whole cents (integers), so there are no floating-point rounding errors.

/** Default daily limit: 5,000.00 EUR in cents (REQ-TL-5). */
export const DEFAULT_DAILY_LIMIT_CENTS = 500_000;

/** Why a transfer was rejected. */
export type RejectionReason = 'LIMIT_EXCEEDED' | 'INVALID_AMOUNT';

/**
 * The decision for one transfer. Both outcomes say how much of today's limit is left (REQ-TL-4):
 * after the transfer if it was approved, unchanged if it was rejected.
 */
export type TransferDecision =
  | { status: 'approved'; remainingTodayCents: number }
  | { status: 'rejected'; reason: RejectionReason; remainingTodayCents: number };

export interface TransferRequest {
  /** Amount of the new transfer, in cents. */
  amountCents: number;
  /** Total already sent today, in cents. */
  sentTodayCents: number;
  /** The customer's daily limit, in cents. Defaults to 5,000.00 EUR. */
  dailyLimitCents?: number;
}

// A valid amount of money here: a whole number of cents, zero or more, small enough
// for JavaScript to count exactly (Number.isSafeInteger also rejects NaN and Infinity).
const isWholeCents = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

/**
 * Decides whether a transfer fits within the customer's daily limit.
 * See requirements/daily-transfer-limit.md.
 *
 * Throws RangeError when the caller passes an invalid limit or day total:
 * that is a bug in the caller, not a customer decision.
 */
export function decideTransfer({
  amountCents,
  sentTodayCents,
  dailyLimitCents = DEFAULT_DAILY_LIMIT_CENTS,
}: TransferRequest): TransferDecision {
  // 1. Check the inputs that come from our own system. Bad values here are bugs, so we throw.
  if (!isWholeCents(dailyLimitCents)) {
    throw new RangeError('dailyLimitCents must be a whole number of cents, zero or more');
  }
  if (!isWholeCents(sentTodayCents)) {
    throw new RangeError('sentTodayCents must be a whole number of cents, zero or more');
  }

  // 2. What is left of today's limit before this transfer. Never below zero (REQ-TL-4),
  //    even if the limit was lowered after the customer had already sent more.
  const remainingTodayCents = Math.max(0, dailyLimitCents - sentTodayCents);

  // 3. The amount comes from the customer, so a bad amount is a rejection, not an error (REQ-TL-3).
  if (!isWholeCents(amountCents) || amountCents === 0) {
    return { status: 'rejected', reason: 'INVALID_AMOUNT', remainingTodayCents };
  }

  // 4. Approve when the day's total stays within the limit. "<=" because reaching the
  //    limit exactly is allowed (REQ-TL-1). This is the line the mutation gate guards.
  if (sentTodayCents + amountCents <= dailyLimitCents) {
    return { status: 'approved', remainingTodayCents: remainingTodayCents - amountCents };
  }

  // 5. Otherwise reject the whole transfer; nothing is sent partly (REQ-TL-2).
  return { status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents };
}
