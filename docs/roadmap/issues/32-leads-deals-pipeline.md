---
title: "Leads and deals pipeline (Kanban)"
labels: [feature, fullstack, crm, P0]
milestone: "M4 CRM"
size: L
depends_on: [31, 19]
---
## Why
This is what turns the "CRM" in the product name from a customer list into a sales tool.

## Tasks
- [ ] `Lead` model (source, status, owner) with "Convert to customer + deal"
- [ ] `Deal` model: title, client, value, currency, stage, probability, expected close date, owner, lost reason
- [ ] Configurable pipelines and stages per organization
- [ ] Kanban board with drag-and-drop (`@dnd-kit`), stage totals and weighted value; a list view with filters
- [ ] "Create quote" from a deal; when the quote is accepted, the deal moves to Won
- [ ] Dashboard widgets: pipeline value, win rate, deals closing this month

## Acceptance criteria
- A sales user can take a lead → deal → quote → invoice entirely in the app
