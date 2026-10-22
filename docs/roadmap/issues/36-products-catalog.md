---
title: "Products and services catalog"
labels: [feature, fullstack, erp, P0]
milestone: "M5 ERP"
size: M
depends_on: [15]
---
## Why
Invoice and quote line items are free text. A catalog makes data entry faster and is required for inventory and reporting.

## Tasks
- [ ] `Product` model: SKU, name, description, type (product/service), unit, price, cost, default tax, category, active, image
- [ ] Product CRUD pages
- [ ] Invoice/quote line items: search products (`AutoCompleteAsync`), auto-fill price/tax, still allow free-text items
- [ ] Store a reference to `product` on items

## Acceptance criteria
- Creating an invoice from catalog items is faster than typing them; reports can group by product
