// Euro amounts typed by a customer, and how amounts are shown back to them.
import { describe, expect, it } from 'vitest';
import { formatEuros, parseEuros } from '../src/euros';

describe('parseEuros: the text a customer types, to whole cents', () => {
  it.each`
    text           | cents
    ${'25'}        | ${2500}
    ${'25.5'}      | ${2550}
    ${'25.50'}     | ${2550}
    ${'0.29'}      | ${29}
    ${'0.01'}      | ${1}
    ${'5000.00'}   | ${500_000}
    ${'  12.30  '} | ${1230}
    ${'0'}         | ${0}
    ${'999999999.99'} | ${99_999_999_999}
  `('"$text" is $cents cents', ({ text, cents }) => {
    expect(parseEuros(text)).toBe(cents);
  });

  // RISK-TL-INVALID: none of these is an amount, so none can be sent.
  it.each(['', 'abc', '-5', '+5', '12.345', '1,000.00', '1 000', '.50', '5.', '1e3', '1234567890', '12.3.4'])(
    'RISK-TL-INVALID: "%s" is not an amount',
    (text) => {
      expect(parseEuros(text)).toBeNull();
    },
  );
});

describe('formatEuros: cents as the customer reads them', () => {
  it.each`
    cents          | text
    ${0}           | ${'€0.00'}
    ${1}           | ${'€0.01'}
    ${99}          | ${'€0.99'}
    ${2550}        | ${'€25.50'}
    ${500_000}     | ${'€5,000.00'}
    ${123_456_789} | ${'€1,234,567.89'}
  `('$cents cents is $text', ({ cents, text }) => {
    expect(formatEuros(cents)).toBe(text);
  });
});
