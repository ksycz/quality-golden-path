import { describe, expect, it } from 'vitest';
import { checkSingleTransfer } from '../src/single-transfer-limit';
import { eur } from './money';

describe('RISK-TL-SINGLE-MAX · REQ-TL-6: single transfer maximum', () => {
  it('allows a normal transfer', () => {
    expect(checkSingleTransfer(eur(100)).allowed).toBe(true);
  });

  it('rejects a large transfer', () => {
    expect(checkSingleTransfer(eur(5000)).allowed).toBe(false);
  });
});
