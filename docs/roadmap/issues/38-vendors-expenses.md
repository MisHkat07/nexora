---
title: "Vendors and expenses with receipt upload"
labels: [feature, fullstack, erp, P1]
milestone: "M5 ERP"
size: M
depends_on: [8, 15]
---
## Why
Without expenses the app only shows revenue; with them it can show profit.

## Tasks
- [ ] `Vendor` model (like Client)
- [ ] `Expense` model: date, vendor, category, amount, tax, currency, payment mode, receipt file, billable-to-client flag
- [ ] Expense categories setting
- [ ] Turn billable expenses into invoice line items

## Acceptance criteria
- The dashboard shows revenue vs. expenses for the month
