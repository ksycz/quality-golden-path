// How much each customer has sent today, kept in memory for the demo service.
// A real service would read this from its database; when "today" starts is out of scope (see the requirement).

export interface DayLedger {
  /** Total sent today by this customer, in cents. Zero for a customer who hasn't sent anything. */
  sentToday(customer: string): number;
  /** Adds an approved transfer to the customer's total. */
  add(customer: string, cents: number): void;
}

export function createDayLedger(): DayLedger {
  const totals = new Map<string, number>();
  return {
    sentToday: (customer) => totals.get(customer) ?? 0,
    add: (customer, cents) => {
      totals.set(customer, (totals.get(customer) ?? 0) + cents);
    },
  };
}
