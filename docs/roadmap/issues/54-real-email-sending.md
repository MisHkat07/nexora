---
title: "Implement invoice/quote/payment email sending (currently a stub)"
labels: [bug, feature, backend, P0]
milestone: "M3 Get Paid"
size: M
depends_on: [1, 26]
---
## Why
`invoiceController/sendMail.js`, `quoteController/sendMail.js` and `paymentController/sendMail.js` only return *"Please Upgrade to Premium Version to have full features"*. This is left over from the IDURAR template. The README lists "Send invoices by email", but the feature doesn't work.

## Tasks
- [ ] Email template per document type (company branding, amount, due date, "View / Download" button)
- [ ] Send through Resend (already a dependency), with the PDF attached or a signed download link (`signDownloadUrl`, 7-day TTL)
- [ ] Recipient defaults to the client email; allow CC and a custom message from the UI
- [ ] Set invoice/quote `status: 'sent'` on success; record the send on the document
- [ ] Clear error when `RESEND_API` or the sender email setting is missing

## Acceptance criteria
- Clicking "Send" on an invoice delivers an email with a working PDF link
