---
title: "Per-organization settings and branding"
labels: [feature, fullstack, saas, P1]
milestone: "M2 SaaS Core"
size: M
depends_on: [15]
---
## Why
`Setting` documents are global. Each organization needs its own company info, logo, currency, number prefixes, and email/PDF branding.

## Tasks
- [ ] Scope `Setting` by `organizationId`; cache per org (the `node-cache` already in use) with invalidation on update
- [ ] Settings for brand color + email footer + PDF template choice
- [ ] Load org settings in emails and PDFs

## Acceptance criteria
- Two orgs show different logos, currencies and invoice prefixes on the same deployment
