---
title: "Role-based access control (backend + frontend)"
labels: [feature, security, fullstack, saas, P0]
milestone: "M2 SaaS Core"
size: L
depends_on: [15]
---
## Tasks
- [ ] Permission matrix `entity:action` (e.g. `invoice:create`, `payment:delete`, `settings:update`, `team:manage`)
- [ ] Built-in roles: Owner, Admin, Accountant (finance only), Sales (clients, quotes, read invoices), Viewer (read-only)
- [ ] `authorize('invoice:create')` middleware applied in `appApi.js` / `coreApi.js` routes
- [ ] Frontend: a `usePermission()` hook; hide/disable nav items and buttons; route guards
- [ ] Optional record-level rule: Sales sees only clients `assigned` to them (the field already exists on `Client`)

## Acceptance criteria
- API tests for each role × each entity action
- A Viewer cannot change anything, even with direct API calls
