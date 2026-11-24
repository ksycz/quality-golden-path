/** Euros to whole cents, so tests can say eur(4999.99) instead of 499_999. */
export const eur = (euros: number): number => Math.round(euros * 100);
