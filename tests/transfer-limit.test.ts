import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_LIMIT_CENTS, decideTransfer } from '../src/transfer-limit';

// Test names start with the risk ID from risks.yml and the requirement ID they prove.

describe('RISK-TL-BOUNDARY · REQ-TL-1: reaching the limit exactly is allowed', () => {
  it('approves a single transfer of exactly the default limit', () => {
    expect(decideTransfer({ amountCents: 500_000, sentTodayCents: 0 })).toEqual({
      status: 'approved',
      remainingTodayCents: 0,
    });
  });

  it('rejects a single transfer one cent over the default limit', () => {
    expect(decideTransfer({ amountCents: 500_001, sentTodayCents: 0 })).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 500_000,
    });
  });

  it('approves the last cent of the day', () => {
    expect(decideTransfer({ amountCents: 1, sentTodayCents: 499_999 })).toEqual({
      status: 'approved',
      remainingTodayCents: 0,
    });
  });

  it('rejects two cents when only one is left', () => {
    expect(decideTransfer({ amountCents: 2, sentTodayCents: 499_999 })).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 1,
    });
  });
});

describe('RISK-TL-PARTIAL · REQ-TL-2: over the limit is rejected entirely', () => {
  it('rejects any transfer once the limit is used up', () => {
    expect(decideTransfer({ amountCents: 1, sentTodayCents: 500_000 })).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 0,
    });
  });
});

describe('RISK-TL-INVALID · REQ-TL-3: only positive whole cents are valid', () => {
  it.each([
    ['zero', 0],
    ['negative', -100],
    ['fractional cents', 10.5],
    ['not a number', Number.NaN],
    ['infinity', Number.POSITIVE_INFINITY],
    ['beyond safe integer range', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects an amount that is %s', (_label, amountCents) => {
    expect(decideTransfer({ amountCents, sentTodayCents: 100_000 })).toEqual({
      status: 'rejected',
      reason: 'INVALID_AMOUNT',
      remainingTodayCents: 400_000,
    });
  });
});

describe('RISK-TL-REMAINING · REQ-TL-4: remaining limit is shown and never negative', () => {
  it('shows zero, not a negative number, when the day total is already over a lowered limit', () => {
    expect(decideTransfer({ amountCents: 1, sentTodayCents: 300_000, dailyLimitCents: 200_000 })).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 0,
    });
  });
});

describe('REQ-TL-5: default and custom limits', () => {
  it('uses 5,000.00 EUR as the default limit', () => {
    expect(DEFAULT_DAILY_LIMIT_CENTS).toBe(500_000);
  });

  it('applies a custom limit at its exact boundary', () => {
    expect(decideTransfer({ amountCents: 100_000, sentTodayCents: 0, dailyLimitCents: 100_000 }).status).toBe('approved');
    expect(decideTransfer({ amountCents: 100_001, sentTodayCents: 0, dailyLimitCents: 100_000 }).status).toBe('rejected');
  });

  it('rejects every transfer when the limit is zero', () => {
    expect(decideTransfer({ amountCents: 1, sentTodayCents: 0, dailyLimitCents: 0 })).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 0,
    });
  });

  it.each([
    ['a negative limit', { dailyLimitCents: -1, sentTodayCents: 0 }],
    ['a fractional limit', { dailyLimitCents: 10.5, sentTodayCents: 0 }],
    ['a negative day total', { dailyLimitCents: 100, sentTodayCents: -1 }],
    ['a fractional day total', { dailyLimitCents: 100, sentTodayCents: 0.5 }],
  ])('throws on %s, because that is a bug in the caller', (_label, input) => {
    expect(() => decideTransfer({ amountCents: 1, ...input })).toThrow(RangeError);
  });
});
