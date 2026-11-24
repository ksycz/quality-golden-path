import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_LIMIT_CENTS, decideTransfer } from '../src/transfer-limit';
import { eur } from './money';

// Each describe names the risk (risks.yml) and the requirement it proves
// (requirements/daily-transfer-limit.md). All amounts are in euros via eur().

describe('REQ-TL-1, REQ-TL-2, REQ-TL-4: the examples table from the requirement', () => {
  // Default limit: 5,000.00 EUR. Same rows, same order as the requirement file.
  it.each`
    sentToday  | amount     | result              | leftToday
    ${0}       | ${5000}    | ${'approved'}       | ${0}
    ${0}       | ${5000.01} | ${'LIMIT_EXCEEDED'} | ${5000}
    ${4999.99} | ${0.01}    | ${'approved'}       | ${0}
    ${4999.99} | ${0.02}    | ${'LIMIT_EXCEEDED'} | ${0.01}
    ${1000}    | ${0}       | ${'INVALID_AMOUNT'} | ${4000}
  `('sent €$sentToday today, sends €$amount → $result, €$leftToday left', ({ sentToday, amount, result, leftToday }) => {
    const decision = decideTransfer({ sentTodayCents: eur(sentToday), amountCents: eur(amount) });

    expect(decision.status === 'approved' ? 'approved' : decision.reason).toBe(result);
    expect(decision.remainingTodayCents).toBe(eur(leftToday));
  });
});

describe('RISK-TL-PARTIAL · REQ-TL-2: nothing goes through once the limit is used up', () => {
  it('rejects even one cent when €5,000 has already been sent', () => {
    const decision = decideTransfer({ sentTodayCents: eur(5000), amountCents: eur(0.01) });

    expect(decision).toEqual({ status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents: 0 });
  });
});

describe('RISK-TL-INVALID · REQ-TL-3: only a positive whole number of cents is a valid amount', () => {
  it.each([
    ['zero', 0],
    ['negative', -100],
    ['half a cent', 10.5],
    ['not a number', Number.NaN],
    ['infinity', Number.POSITIVE_INFINITY],
    ['too large to count exactly', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects an amount that is %s', (_label, amountCents) => {
    const decision = decideTransfer({ sentTodayCents: eur(1000), amountCents });

    expect(decision).toEqual({ status: 'rejected', reason: 'INVALID_AMOUNT', remainingTodayCents: eur(4000) });
  });
});

describe('RISK-TL-REMAINING · REQ-TL-4: what is left is never negative', () => {
  it('shows €0 left, not minus, when the limit was lowered below what was already sent', () => {
    const decision = decideTransfer({ dailyLimitCents: eur(2000), sentTodayCents: eur(3000), amountCents: eur(0.01) });

    expect(decision.remainingTodayCents).toBe(0);
  });
});

describe('REQ-TL-5: default and custom limits', () => {
  it('uses €5,000 as the default limit', () => {
    expect(DEFAULT_DAILY_LIMIT_CENTS).toBe(eur(5000));
  });

  it('allows exactly a custom €1,000 limit, and not one cent more', () => {
    const limit = { dailyLimitCents: eur(1000), sentTodayCents: 0 };

    expect(decideTransfer({ ...limit, amountCents: eur(1000) }).status).toBe('approved');
    expect(decideTransfer({ ...limit, amountCents: eur(1000.01) }).status).toBe('rejected');
  });

  it('rejects everything when the limit is €0', () => {
    const decision = decideTransfer({ dailyLimitCents: 0, sentTodayCents: 0, amountCents: eur(0.01) });

    expect(decision).toEqual({ status: 'rejected', reason: 'LIMIT_EXCEEDED', remainingTodayCents: 0 });
  });

  // A bad limit or day total is a bug in the calling code, not a customer decision, so it throws.
  it.each([
    ['a negative limit', { dailyLimitCents: -1, sentTodayCents: 0 }],
    ['a limit with half a cent', { dailyLimitCents: 10.5, sentTodayCents: 0 }],
    ['a negative total sent today', { dailyLimitCents: eur(5000), sentTodayCents: -1 }],
    ['a total sent today with half a cent', { dailyLimitCents: eur(5000), sentTodayCents: 0.5 }],
  ])('throws on %s', (_label, setup) => {
    expect(() => decideTransfer({ ...setup, amountCents: eur(1) })).toThrow(RangeError);
  });
});
