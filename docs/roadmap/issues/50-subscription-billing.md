---
title: "SaaS plans and subscription billing"
labels: [feature, fullstack, saas, gtm, P1]
milestone: "M7 Launch"
size: L
depends_on: [17, 18]
---
## Tasks
- [ ] Plans (Free / Starter / Pro) with limits: users, invoices per month, storage, AI credits
- [ ] Stripe Billing: checkout, customer portal, webhooks → `Organization.plan/status`
- [ ] 14-day trial; grace period and read-only mode when payment fails
- [ ] Enforce limits in the API, plus friendly upgrade prompts in the UI

## Acceptance criteria
- Upgrading/downgrading changes limits immediately; a failed payment downgrades after the grace period
