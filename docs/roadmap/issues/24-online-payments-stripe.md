---
title: "Online invoice payments (Stripe + local gateway) with webhooks"
labels: [feature, fullstack, payments, P0]
milestone: "M3 Get Paid"
size: L
depends_on: [6, 15, 26]
---
## Why
"Pay now" on an invoice is the biggest single feature for invoicing products, and it shortens the time to get paid.

## Tasks
- [ ] Payment-provider interface; first implement Stripe Connect (each org connects its own account), then a local gateway (e.g. SSLCommerz / bKash for BD customers)
- [ ] Generate a Checkout session / payment link per invoice for the outstanding balance
- [ ] Webhook endpoint (signature verified, idempotent by event ID) → create a `Payment` through the same transactional service as #6, with payment mode "Card (Stripe)"
- [ ] "Pay online" button in the invoice email, PDF (link/QR) and client portal (#27)
- [ ] Handle refunds and failed payments

## Acceptance criteria
- Paying via Stripe test mode marks the invoice paid/partially within seconds
- Replaying a webhook does not double-record
