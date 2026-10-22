---
title: "Credit notes and refunds"
labels: [feature, fullstack, finance, P2]
milestone: "M3 Get Paid"
size: M
depends_on: [6]
---
## Tasks
- [ ] `CreditNote` model linked to an invoice (full or partial, by line item), with its own numbering
- [ ] Apply a credit to an invoice balance or record it as a refund
- [ ] PDF + email, shown on the client's statement
- [ ] Invoices can't be hard-deleted once sent; use void + credit note instead (accounting-safe)

## Acceptance criteria
- Issuing a credit note correctly reduces the balance and shows in reports
