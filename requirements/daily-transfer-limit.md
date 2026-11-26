# Requirement: daily transfer limit

**Risk Tier:** 1 (moves money)
**Status:** accepted

A customer of a (fictional) payment service has a daily limit on outgoing transfers. The limit protects the customer if their account is taken over, and protects the service from large unauthorised transfers.

All amounts are whole **cents** (integers). There are no fractions of a cent.

## Rules

| ID | Rule |
|---|---|
| **REQ-TL-1** | A transfer is approved when the customer's total sent today **plus** the new amount is **less than or equal to** the daily limit. Reaching the limit exactly is allowed. |
| **REQ-TL-2** | A transfer that would take the day's total **over** the limit is rejected **entirely**, with reason `LIMIT_EXCEEDED`. There are no partial transfers. |
| **REQ-TL-3** | The amount must be a positive whole number of cents. Anything else (zero, negative, fractional, not a number) is rejected with reason `INVALID_AMOUNT`. |
| **REQ-TL-4** | Every decision tells the customer how much of today's limit is left: after the transfer if approved, unchanged if rejected. It is never negative. |
| **REQ-TL-5** | The default daily limit is **5,000.00 EUR** (500,000 cents). A customer can have a different limit; a limit is a whole number of cents, zero or more. |
| **REQ-TL-6** | A single transfer may be at most **2,000.00 EUR** (200,000 cents). Exactly 2,000.00 is allowed; anything above is rejected with reason `SINGLE_TRANSFER_LIMIT`. |

## Examples

| Sent today | Amount | Limit | Decision | Left today |
|---|---|---|---|---|
| 0.00 | 5,000.00 | 5,000.00 | approved | 0.00 |
| 0.00 | 5,000.01 | 5,000.00 | rejected `LIMIT_EXCEEDED` | 5,000.00 |
| 4,999.99 | 0.01 | 5,000.00 | approved | 0.00 |
| 4,999.99 | 0.02 | 5,000.00 | rejected `LIMIT_EXCEEDED` | 0.01 |
| 1,000.00 | 0.00 | 5,000.00 | rejected `INVALID_AMOUNT` | 4,000.00 |

Single transfer maximum (REQ-TL-6):

| Amount | Decision |
|---|---|
| 2,000.00 | allowed |
| 2,000.01 | rejected `SINGLE_TRANSFER_LIMIT` |

## Out of scope

Currency conversion, time zones and when "today" starts. The caller passes in the total already sent today.
