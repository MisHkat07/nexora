---
title: "Financial reports: P&L, AR aging, tax, sales by customer/product"
labels: [feature, fullstack, reports, P1]
milestone: "M5 ERP"
size: L
depends_on: [38, 30]
---
## Tasks
- [ ] Reports module with date-range + compare-to-previous filters
- [ ] Profit & Loss (cash and accrual basis)
- [ ] Accounts receivable aging (current, 1–30, 31–60, 61–90, 90+), by client
- [ ] Tax summary (collected vs. paid) for filing
- [ ] Sales by customer / product / salesperson
- [ ] Customer statement PDF
- [ ] Export to CSV/PDF; MongoDB aggregation with the right indexes

## Acceptance criteria
- Report totals match the sums of the underlying documents (tested)
