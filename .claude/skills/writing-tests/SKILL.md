---
name: writing-tests
description: How to write tests that encode the requirement. Use when writing, changing or reviewing a test in this repo.
---

# Writing tests

A test is the **oracle**: it states what the requirement means. A test that only replays the code is **tautological**: it passes against buggy code, so it proves nothing.

## Steps

1. Pick the requirement row (`REQ-TL-*`) and the risk (`RISK-TL-*`) the test proves. Put both in the `describe`.
2. Take expected values from the requirement's text and examples table, never from running the code or copying its formula.
3. Cover the boundary from both sides: exactly at the limit, one cent over, one cent under.
4. For a rule that must hold for any amount, add a property-based test (fast-check) and state the rule in plain English in the test name.
5. Write amounts in euros with `eur()` from `tests/money.ts`.
6. Check the test can go **red**: break the code on purpose (for example `<=` to `<`) and see it fail. The mutation gate does this for every change.

Done means: each new test names its risk and requirement, its expected values come from the requirement, and it fails when the behaviour it guards is broken.

## Tautological vs from the requirement

Tautological: the expected value is computed the same way the code computes it. If the code's formula is wrong, the test agrees with it.

```ts
it('calculates remaining limit', () => {
  const sent = 499_999, amount = 1, limit = 500_000;
  const result = decideTransfer({ amountCents: amount, sentTodayCents: sent, dailyLimitCents: limit });
  expect(result.remainingTodayCents).toBe(limit - sent - amount); // copies the code
});
```

From the requirement: the expected value is a fact taken from the requirement's examples table, and the name says which rule it proves.

```ts
describe('RISK-TL-BOUNDARY · REQ-TL-1: reaching the limit exactly is allowed', () => {
  it('approves the last cent of the day', () => {
    const decision = decideTransfer({ sentTodayCents: eur(4999.99), amountCents: eur(0.01) });
    expect(decision).toEqual({ status: 'approved', remainingTodayCents: 0 });
  });
});
```

## Where each kind of test goes

- Boundaries and money rules: unit and property-based tests. They are fast and exact.
- "Does it work together?": the small Playwright smoke suite. It never re-tests boundaries.
