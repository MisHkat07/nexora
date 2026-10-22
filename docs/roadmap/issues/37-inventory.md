---
title: "Inventory: stock levels, movements and warehouses"
labels: [feature, fullstack, erp, P1]
milestone: "M5 ERP"
size: L
depends_on: [36, 6]
---
## Tasks
- [ ] `Warehouse` and `StockMovement` (in/out/adjust/transfer, with reference document) models; the stock level is the sum of movements
- [ ] Sending or marking an invoice as issued deducts stock (configurable); purchase-order receipt (#39) adds stock
- [ ] Low-stock threshold + alert
- [ ] Inventory valuation (average cost) report
- [ ] Replace the placeholder `middlewares/inventory`

## Acceptance criteria
- Stock never goes inconsistent after concurrent invoices (transactions)
