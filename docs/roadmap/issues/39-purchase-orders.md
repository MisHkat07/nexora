---
title: "Purchase orders and bills"
labels: [feature, fullstack, erp, P2]
milestone: "M5 ERP"
size: M
depends_on: [36, 38]
---
## Tasks
- [ ] `PurchaseOrder` (draft → sent → partially received → received → billed) with PDF + email to the vendor
- [ ] Receiving goods creates stock movements (#37)
- [ ] Convert a PO to a bill (payable); record bill payments

## Acceptance criteria
- A PO → receipt → bill → payment flow updates stock and the accounts payable report
