/** Default daily limit: 5,000.00 EUR in cents (REQ-TL-5). */
export const DEFAULT_DAILY_LIMIT_CENTS = 500_000;

export type RejectionReason = 'LIMIT_EXCEEDED' | 'INVALID_AMOUNT';

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
  if (!isWholeCents(dailyLimitCents)) {
    throw new RangeError('dailyLimitCents must be a whole number of cents, zero or more');
  }
  if (!isWholeCents(sentTodayCents)) {
    throw new RangeError('sentTodayCents must be a whole number of cents, zero or more');
  }

  const remainingTodayCents = Math.max(0, dailyLimitCents - sentTodayCents);

  if (!isWholeCents(amountCents) || amountCents === 0) {
    return { status: 'rejected', reason: 'INVALID_AMOUNT', remainingTodayCents };
  }

  if (sentTodayCents + amountCents <= dailyLimitCents) {
    return { status: 'approved', remainingTodayCents: remainingTodayCents - amountCents };
  }

  return { status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents };
}
