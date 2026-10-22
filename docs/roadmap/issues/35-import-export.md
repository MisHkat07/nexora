---
title: "CSV/Excel import and export"
labels: [feature, fullstack, P1]
milestone: "M4 CRM"
size: M
depends_on: [26]
---
## Why
Customers switching from spreadsheets or other tools need to bring their data with them, so import is often what decides whether they adopt the product.

## Tasks
- [ ] Import clients, contacts, products: upload → column mapping → preview with validation errors → import as a background job
- [ ] Export any list view (current filters) to CSV/XLSX
- [ ] Duplicate detection by email/name

## Acceptance criteria
- Importing 5,000 clients works, with a downloadable error report for bad rows
