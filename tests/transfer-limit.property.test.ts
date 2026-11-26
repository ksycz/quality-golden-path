import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decideTransfer } from '../src/transfer-limit';

// Property-based tests: instead of picking examples, we state a rule that must hold
// for ANY amounts. fast-check tries hundreds of random combinations (including edges
// like 0 and the limit itself) and, if one breaks the rule, shrinks it to the
// smallest failing example.

/** Any whole number of cents from €0 to €100,000. */
const anyCents = fc.integer({ min: 0, max: 10_000_000 });
/** Any valid transfer amount: from one cent to €100,000. */
const anyAmount = fc.integer({ min: 1, max: 10_000_000 });

describe('rules that hold for any amounts', () => {
  it('RISK-TL-BOUNDARY · REQ-TL-1/2: a transfer is approved exactly when the day total stays within the limit', () => {
    fc.assert(
      fc.property(anyAmount, anyCents, anyCents, (amountCents, sentTodayCents, dailyLimitCents) => {
        const decision = decideTransfer({ amountCents, sentTodayCents, dailyLimitCents });

        const staysWithinLimit = sentTodayCents + amountCents <= dailyLimitCents;
        expect(decision.status).toBe(staysWithinLimit ? 'approved' : 'rejected');
      }),
    );
  });

  // Random amounts almost never add up to exactly the limit, so the rule above rarely meets its boundary.
  // This one builds the boundary on purpose: send exactly what is left, then one cent more.
  it('RISK-TL-BOUNDARY · REQ-TL-1/2: exactly what is left today is approved, and one cent more is rejected', () => {
    fc.assert(
      fc.property(anyCents, anyAmount, (sentTodayCents, leftCents) => {
        const dailyLimitCents = sentTodayCents + leftCents;

        expect(decideTransfer({ amountCents: leftCents, sentTodayCents, dailyLimitCents }).status).toBe('approved');
        expect(decideTransfer({ amountCents: leftCents + 1, sentTodayCents, dailyLimitCents }).status).toBe('rejected');
      }),
    );
  });

  it('RISK-TL-PARTIAL · REQ-TL-2/4: what is left goes down by exactly the amount sent, or not at all if rejected', () => {
    fc.assert(
      fc.property(anyAmount, anyCents, anyCents, (amountCents, sentTodayCents, dailyLimitCents) => {
        // Ask with an invalid amount (0) to see what is left before this transfer.
        const leftBefore = decideTransfer({ amountCents: 0, sentTodayCents, dailyLimitCents }).remainingTodayCents;
        const decision = decideTransfer({ amountCents, sentTodayCents, dailyLimitCents });

        const spent = decision.status === 'approved' ? amountCents : 0;
        expect(decision.remainingTodayCents).toBe(leftBefore - spent);
      }),
    );
  });

  it('RISK-TL-REMAINING · REQ-TL-4: what is left is never negative', () => {
    fc.assert(
      fc.property(anyAmount, anyCents, anyCents, (amountCents, sentTodayCents, dailyLimitCents) => {
        const decision = decideTransfer({ amountCents, sentTodayCents, dailyLimitCents });

        expect(decision.remainingTodayCents).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
