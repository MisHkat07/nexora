---
title: "Audit log of user actions"
labels: [feature, backend, compliance, P1]
milestone: "M2 SaaS Core"
size: M
depends_on: [15]
---
## Tasks
- [x] `AuditLog` model: org, user, action, entity, entityId, field-level diff, IP, user agent, timestamp
- [x] Record automatically from the CRUD controller + auth events (login, failed login, role change, export)
- [x] Settings → Audit log page with filters (admin only); "History" tab on invoice/quote/client detail pages
- [x] Retention policy (TTL index, plan-dependent)

## Acceptance criteria
- Editing an invoice total shows who changed it, when, and the old → new value
