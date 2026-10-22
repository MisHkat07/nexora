---
title: "Recurring invoice scheduler"
labels: [feature, backend, P1]
milestone: "M3 Get Paid"
size: M
depends_on: [26]
---
## Why
`Invoice.recurring` exists in the model, but nothing ever generates the next invoice.

## Tasks
- [ ] Recurring profile: frequency (weekly/monthly/quarterly/yearly), start, end / occurrence count, next run date, auto-send flag
- [ ] Repeating job that clones the template invoice with a new number and dates, then optionally emails it with the PDF and pay link
- [ ] UI: create a recurring profile from an invoice; list profiles with pause/resume and history
- [ ] Idempotency: never generate two invoices for the same period

## Acceptance criteria
- A monthly profile creates exactly one invoice per month, including across restarts
