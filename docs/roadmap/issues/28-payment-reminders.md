---
title: "Automatic payment reminders (dunning)"
labels: [feature, backend, P1]
milestone: "M3 Get Paid"
size: M
depends_on: [26]
---
## Tasks
- [ ] Per-org reminder rules (e.g. 3 days before due, on the due date, 7 / 14 / 30 days overdue)
- [ ] Daily job finds unpaid/partial invoices that match a rule and emails the client with the pay link
- [ ] Per-invoice/client opt-out; reminder history on the invoice
- [ ] Mark invoices `overdue` automatically

## Acceptance criteria
- An overdue invoice gets each reminder exactly once; paying stops further reminders
