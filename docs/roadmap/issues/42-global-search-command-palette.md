---
title: "Global search and Ctrl/Cmd+K command palette"
labels: [feature, fullstack, ux, P2]
milestone: "M6 UX & AI"
size: M
depends_on: [15]
---
## Tasks
- [ ] `GET /api/search?q=` across clients, contacts, invoices (by number), quotes, deals, products; tenant-scoped and permission-aware
- [ ] MongoDB text indexes (or Atlas Search)
- [ ] Ctrl/Cmd+K palette (`cmdk`): results + actions ("New invoice", "Go to settings")
- [ ] Recent items

## Acceptance criteria
- Typing an invoice number or client name opens it in two keystrokes + Enter
