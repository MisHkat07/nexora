---
title: "Organization model and automatic tenant scoping"
labels: [feature, backend, saas, P0]
milestone: "M2 SaaS Core"
size: L
depends_on: [4, 10]
---
## Why
Right now one deployment holds one company's data. To sell this as SaaS, every record must belong to an organization, and no query may ever return another organization's data.

## Tasks
- [ ] `Organization` model: name, slug, plan, status, `createdAt`, owner
- [ ] Add `organizationId` (required, indexed) to every app and core model: Client, Invoice, Quote, Payment, PaymentMode, Taxes, Setting, Upload
- [ ] A Mongoose plugin that makes `find*`, `count*`, `update*`, `delete*` and `aggregate` refuse to run without an org filter (`AsyncLocalStorage` request context set by the auth middleware)
- [ ] Unique indexes become compound with the org (e.g. invoice `number + year + organizationId`)
- [ ] `generateUniqueNumber` / finance-settings numbering per organization

## Acceptance criteria
- A cross-tenant test suite: user A can't read, list, search, update, delete, download or summarize org B's data through any endpoint
- A query without a tenant context throws in dev/test
