---
title: "Client portal: view, accept and pay quotes/invoices"
labels: [feature, fullstack, P1]
milestone: "M3 Get Paid"
size: L
depends_on: [1, 24]
---
## Tasks
- [ ] Public, signed, expiring link per document (`/p/:token`), with no login needed
- [ ] Quote page: view, **Accept** (typed name as e-signature, timestamp, IP) or **Decline** with a comment → updates the status and notifies the owner
- [ ] Optional: automatically convert an accepted quote to an invoice
- [ ] Invoice page: view, download PDF, pay online, payment history
- [ ] Track "viewed" events (first viewed at, view count)
- [ ] Org branding applied (#23)

## Acceptance criteria
- A client can accept a quote and pay the resulting invoice end to end without an account
