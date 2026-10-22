---
title: "Compliance: legal pages, data export/deletion, backups"
labels: [compliance, gtm, P1]
milestone: "M7 Launch"
size: M
depends_on: [15, 26]
---
## Tasks
- [ ] Terms of Service, Privacy Policy, DPA, cookie notice
- [ ] Org data export (full JSON/CSV zip) and account deletion with a 30-day grace period (GDPR)
- [ ] Automated daily backups with a tested restore procedure (Atlas or `mongodump` to object storage)
- [ ] Security page: encryption in transit/at rest, how to report vulnerabilities
- [ ] Per-country invoice requirements where you sell (tax IDs, sequential numbering, e-invoicing readiness)

## Acceptance criteria
- An owner can export everything and delete their organization; a restore has been tested from a backup
