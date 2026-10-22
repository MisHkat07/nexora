---
title: "AI: receipt and bill capture into expenses"
labels: [feature, fullstack, ai, P2]
milestone: "M6 UX & AI"
size: M
depends_on: [38, 47]
---
## Tasks
- [ ] Upload or photograph a receipt/bill (image/PDF) → a vision model extracts vendor, date, total, tax, currency, line items
- [ ] Pre-fill an Expense (or Bill) for review; match or create the vendor
- [ ] Forward-by-email inbox per org (optional)

## Acceptance criteria
- A common receipt is extracted correctly in under 10s and saved after user confirmation
