import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decideTransfer } from '../src/transfer-limit';

// Property-based tests: fast-check generates many inputs, including the edges
// (0, 1, the limit itself), and shrinks any failure to the smallest example.

const cents = (max: number) => fc.integer({ min: 0, max });
const positiveCents = (max: number) => fc.integer({ min: 1, max });
const MAX = 10_000_000; // 100,000.00 EUR is plenty for a daily limit

describe('properties of the daily transfer limit', () => {
  it('RISK-TL-BOUNDARY · REQ-TL-1/2: approved exactly when the day total stays within the limit', () => {
    fc.assert(
      fc.property(positiveCents(MAX), cents(MAX), cents(MAX), (amountCents, sentTodayCents, dailyLimitCents) => {
        const decision = decideTransfer({ amountCents, sentTodayCents, dailyLimitCents });
        expect(decision.status === 'approved').toBe(sentTodayCents + amountCents <= dailyLimitCents);
      }),
    );
  });

  it('RISK-TL-REMAINING · REQ-TL-4: remaining limit is exact and never negative', () => {
    fc.assert(
      fc.property(positiveCents(MAX), cents(MAX), cents(MAX), (amountCents, sentTodayCents, dailyLimitCents) => {
        const decision = decideTransfer({ amountCents, sentTodayCents, dailyLimitCents });
        const before = Math.max(0, dailyLimitCents - sentTodayCents);
        expect(decision.remainingTodayCents).toBeGreaterThanOrEqual(0);
        expect(decision.remainingTodayCents).toBe(decision.status === 'approved' ? before - amountCents : before);
      }),
    );
  });

  it('RISK-TL-PARTIAL · REQ-TL-2: if an amount is approved, every smaller amount is approved too', () => {
    fc.assert(
      fc.property(positiveCents(MAX), cents(MAX), cents(MAX), (amountCents, sentTodayCents, dailyLimitCents) => {
        fc.pre(decideTransfer({ amountCents, sentTodayCents, dailyLimitCents }).status === 'approved');
        const smaller = Math.max(1, Math.floor(amountCents / 2));
        expect(decideTransfer({ amountCents: smaller, sentTodayCents, dailyLimitCents }).status).toBe('approved');
      }),
    );
  });

  it('RISK-TL-INVALID · REQ-TL-3: non-integer amounts are always rejected as invalid', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: false }).filter((n) => !Number.isSafeInteger(n)),
        cents(MAX),
        (amountCents, sentTodayCents) => {
          const decision = decideTransfer({ amountCents, sentTodayCents });
          expect(decision).toMatchObject({ status: 'rejected', reason: 'INVALID_AMOUNT' });
        },
      ),
    );
  });
});
