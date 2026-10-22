---
title: "Activities (tasks, calls, meetings, notes) and customer timeline"
labels: [feature, fullstack, crm, P1]
milestone: "M4 CRM"
size: L
depends_on: [31, 26]
---
## Tasks
- [ ] `Activity` model: type, subject, body (rich text — `react-quill` already in use), due date, assignee, done, links to a client/contact/deal/invoice
- [ ] "My tasks" page (today / overdue / upcoming) and a badge in the header
- [ ] Email or in-app reminder for due tasks (#44)
- [ ] Unified timeline on the customer page: activities + invoices + quotes + payments + emails, newest first

## Acceptance criteria
- Opening a customer shows their full history in one place
