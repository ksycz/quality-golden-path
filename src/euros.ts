// Euro amounts as people type and read them, converted to and from whole cents.
// Parsing works on the text, never through floating point, so "0.29" is exactly 29 cents.

// Digits, then optionally a dot and one or two digits: "25", "25.5", "25.50". No signs, commas or spaces inside.
const EUROS = /^(\d{1,9})(?:\.(\d{1,2}))?$/;

/** "25.50" → 2550. Returns null for anything that isn't a plain euro amount. */
export function parseEuros(text: string): number | null {
  const match = EUROS.exec(text.trim());
  if (!match) return null;
  const [, whole = '0', fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 500000 → "€5,000.00". */
export function formatEuros(cents: number): string {
  const whole = Math.floor(cents / 100).toLocaleString('en-US');
  const fraction = String(cents % 100).padStart(2, '0');
  return `€${whole}.${fraction}`;
}
