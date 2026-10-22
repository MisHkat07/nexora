---
title: "Multi-currency invoices with exchange rates"
labels: [feature, fullstack, finance, P2]
milestone: "M3 Get Paid"
size: M
depends_on: [23]
---
## Tasks
- [ ] Each document has its own currency (default from client → org)
- [ ] Store the exchange rate to the org's base currency at issue time; daily rate fetch job (e.g. an open exchange-rate API)
- [ ] Dashboard and reports convert to the base currency
- [ ] Record payments in a different currency, with a gain/loss note

## Acceptance criteria
- A USD invoice for a BDT-base org shows correct totals in both currencies on the dashboard
