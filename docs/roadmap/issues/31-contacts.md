---
title: "Contacts: multiple people per customer"
labels: [feature, fullstack, crm, P1]
milestone: "M4 CRM"
size: M
depends_on: [15]
---
## Tasks
- [ ] `Contact` model: name, title, email, phone, `client` reference, primary flag, notes
- [ ] Customer detail page gets a Contacts tab; add/edit inline
- [ ] Invoices/quotes choose a billing contact (email recipient); support CC
- [ ] Migration: turn the current client `email`/`phone` into a primary contact

## Acceptance criteria
- Sending an invoice goes to the selected contact(s)
