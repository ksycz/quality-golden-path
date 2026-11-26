// Sending transfers from the transfer page through one day.
// Expected amounts and outcomes come from requirements/daily-transfer-limit.md (default limit €5,000.00).
import { describe, expect, it } from 'vitest';
import { createDayLedger } from '../src/day-ledger';
import { leftToday, sendTransfer } from '../src/send-transfer';

const newDay = () => createDayLedger();

describe('a customer sends transfers through the day', () => {
  it('RISK-TL-BOUNDARY: two transfers that reach the limit exactly are both sent', () => {
    const ledger = newDay();
    expect(sendTransfer(ledger, 'ana', '3000.00')).toEqual({
      status: 'approved',
      remainingTodayCents: 200_000,
      leftToday: '€2,000.00',
      message: 'Sent €3,000.00. You can send €2,000.00 more today.',
    });
    expect(sendTransfer(ledger, 'ana', '2000')).toMatchObject({ status: 'approved', leftToday: '€0.00' });
    expect(ledger.sentToday('ana')).toBe(500_000);
  });

  it('RISK-TL-PARTIAL: one cent over is not sent at all, and what is left stays the same', () => {
    const ledger = newDay();
    sendTransfer(ledger, 'ana', '4999.99');
    expect(sendTransfer(ledger, 'ana', '0.02')).toEqual({
      status: 'rejected',
      reason: 'LIMIT_EXCEEDED',
      remainingTodayCents: 1,
      leftToday: '€0.01',
      message: 'Not sent: this would go over your daily limit. You can send €0.01 more today.',
    });
    expect(ledger.sentToday('ana')).toBe(499_999);
  });

  it.each(['0', '-5', '12.345', 'ten'])('RISK-TL-INVALID: "%s" is not sent and uses none of the limit', (text) => {
    const ledger = newDay();
    sendTransfer(ledger, 'ana', '1000');
    expect(sendTransfer(ledger, 'ana', text)).toEqual({
      status: 'rejected',
      reason: 'INVALID_AMOUNT',
      remainingTodayCents: 400_000,
      leftToday: '€4,000.00',
      message: 'Not sent: enter an amount in euros, like 25.00.',
    });
    expect(ledger.sentToday('ana')).toBe(100_000);
  });

  it('each customer has their own day total', () => {
    const ledger = newDay();
    sendTransfer(ledger, 'ana', '5000');
    expect(sendTransfer(ledger, 'ben', '5000')).toMatchObject({ status: 'approved' });
  });
});

describe('RISK-TL-REMAINING: what is left today, before sending', () => {
  it('is the whole limit for a customer who has sent nothing', () => {
    expect(leftToday(newDay(), 'ana')).toBe('€5,000.00');
  });

  it('goes down by each transfer sent', () => {
    const ledger = newDay();
    sendTransfer(ledger, 'ana', '1250.50');
    expect(leftToday(ledger, 'ana')).toBe('€3,749.50');
  });
});
