---
title: "Implement quote → invoice conversion (currently a stub)"
labels: [bug, feature, backend, P0]
milestone: "M3 Get Paid"
size: S
depends_on: [6]
---
## Why
`quoteController/convertQuoteToInvoice.js` only returns *"Please Upgrade to Premium Version to have full features"*, left over from the IDURAR template. The README advertises "Convert a quote into an invoice in one step".

## Tasks
- [ ] In a transaction: create an invoice from the quote (client, items, tax, notes) with the next invoice number (`last_invoice_number`), set `converted: { from: 'quote', quote: <id> }`, mark the quote `converted: true` / status `accepted`
- [ ] Refuse to convert the same quote twice (return the existing invoice instead)
- [ ] The frontend navigates to the new invoice after converting

## Acceptance criteria
- Converting a quote creates exactly one invoice with identical items and totals; tests cover the double-convert case
