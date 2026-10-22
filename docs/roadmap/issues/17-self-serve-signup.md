---
title: "Self-serve signup with email verification"
labels: [feature, fullstack, saas, P0]
milestone: "M2 SaaS Core"
size: M
depends_on: [15]
---
## Tasks
- [ ] `POST /api/register`: creates an Organization + owner user + default settings, taxes and payment modes (reuse `setup/defaultSettings`)
- [ ] Email verification via Resend; unverified accounts have limited access
- [ ] Signup page (company name, name, email, password, country/currency)
- [ ] Optional: Google OAuth sign-in

## Acceptance criteria
- A new user can sign up, verify, and create an invoice within 2 minutes, with no CLI `setup` step
