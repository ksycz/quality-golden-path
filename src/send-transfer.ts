// A customer sends a transfer from the transfer page: the amount arrives as typed text,
// the decision comes from decideTransfer, and the answer is worded for the customer.
import type { DayLedger } from './day-ledger.ts';
import { formatEuros, parseEuros } from './euros.ts';
import { decideTransfer, type TransferDecision } from './transfer-limit.ts';

export type SendResult = TransferDecision & {
  /** What the page shows the customer. */
  message: string;
  /** Today's limit left after this decision, e.g. "€1,250.00" (REQ-TL-4). */
  leftToday: string;
};

/** Decides the transfer and, only when it is approved, adds it to the customer's day total. */
export function sendTransfer(ledger: DayLedger, customer: string, amountText: string): SendResult {
  // Text that isn't a euro amount becomes NaN, which decideTransfer rejects as INVALID_AMOUNT (REQ-TL-3).
  const amountCents = parseEuros(amountText) ?? Number.NaN;
  const decision = decideTransfer({ amountCents, sentTodayCents: ledger.sentToday(customer) });
  if (decision.status === 'approved') ledger.add(customer, amountCents);

  const leftToday = formatEuros(decision.remainingTodayCents);
  return { ...decision, leftToday, message: messageFor(decision, amountCents, leftToday) };
}

/** What is left of today's limit for a customer, before they send anything. */
export function leftToday(ledger: DayLedger, customer: string): string {
  return formatEuros(decideTransfer({ amountCents: 0, sentTodayCents: ledger.sentToday(customer) }).remainingTodayCents);
}

function messageFor(decision: TransferDecision, amountCents: number, leftToday: string): string {
  if (decision.status === 'approved') return `Sent ${formatEuros(amountCents)}. You can send ${leftToday} more today.`;
  if (decision.reason === 'LIMIT_EXCEEDED') return `Not sent: this would go over your daily limit. You can send ${leftToday} more today.`;
  return 'Not sent: enter an amount in euros, like 25.00.';
}
