// Single transfer maximum: one transfer may be at most 2,000.00 EUR (REQ-TL-6).
// All money is in whole cents.

/** The largest single transfer allowed: 2,000.00 EUR in cents. */
export const MAX_SINGLE_TRANSFER_CENTS = 200_000;

export type SingleTransferCheck =
  | { allowed: true }
  | { allowed: false; reason: 'SINGLE_TRANSFER_LIMIT'; message: string };

/** Checks one transfer amount against the single transfer maximum. */
export function checkSingleTransfer(amountCents: number): SingleTransferCheck {
  if (amountCents < MAX_SINGLE_TRANSFER_CENTS) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'SINGLE_TRANSFER_LIMIT',
    message: 'A single transfer can be at most €2,000.00.',
  };
}
