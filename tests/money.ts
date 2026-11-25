/**
 * Euros to whole cents, so tests can say eur(4999.99) instead of 499_999.
 * Math.round removes floating-point noise: in JavaScript 1.15 * 100 is 114.99999999999999, not 115.
 */
export const eur = (euros: number): number => Math.round(euros * 100);
