---
title: "Background job queue for emails, PDFs and scheduled work"
labels: [infra, backend, P1]
milestone: "M3 Get Paid"
size: M
depends_on: [12]
---
## Why
Emails and PDFs currently run inside the HTTP request. Retries, scheduling (#25, #28) and webhooks (#24) need a durable queue.

## Tasks
- [ ] BullMQ + Redis (Render Key Value / Upstash), or Agenda on Mongo to avoid adding Redis
- [ ] Separate worker process (`npm run worker`), added to `render.yaml`
- [ ] Move `sendMail` for invoices, quotes and payments to jobs, with retries + backoff
- [ ] Email delivery status stored on the document (queued / sent / failed / opened)

## Acceptance criteria
- API response time for "send invoice" stays under 300ms; failed emails retry and show up in the UI
