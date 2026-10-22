---
title: "Dashboard redesign with real analytics"
labels: [feature, frontend, ux, P1]
milestone: "M6 UX & AI"
size: M
depends_on: [40]
---
## Tasks
- [ ] KPI cards with change vs. the previous period: revenue, outstanding, overdue, average days to pay, expenses, profit
- [ ] Charts (Recharts or `@ant-design/charts`): 12-month revenue vs. expenses, cash-flow forecast from due dates, receivables aging bar, top 5 customers
- [ ] Pipeline widgets from #32
- [ ] Date-range picker; skeleton loading; useful empty states
- [ ] Optional: let users rearrange widgets

## Acceptance criteria
- The dashboard loads in under 1s with 10k invoices (pre-aggregated or indexed)
