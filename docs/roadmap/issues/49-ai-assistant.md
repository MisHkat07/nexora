---
title: "AI assistant: ask questions about your business data"
labels: [feature, fullstack, ai, P2]
milestone: "M6 UX & AI"
size: L
depends_on: [40, 47]
---
## Tasks
- [ ] Chat panel; the model uses read-only, tenant-scoped, permission-checked tools (`get_ar_aging`, `search_invoices`, `revenue_by_period`, `customer_summary`…) — no raw DB queries
- [ ] Answers cite the records/reports they came from, with links
- [ ] Customer summary ("brief me on Acme") and suggested next actions on a deal
- [ ] Log every tool call to the audit log (#22)

## Acceptance criteria
- "Who owes me the most this quarter?" returns the correct answer, with links, for that org only
