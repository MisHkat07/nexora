---
title: "Harden the generic CRUD controller (mass assignment, NoSQL and regex injection)"
labels: [security, backend, P0]
milestone: "M1 Foundation & Security"
size: M
depends_on: []
---
## Why
The generic `createCRUDController` has several injection holes:
- `create.js` / `update.js` spread `req.body` straight into the model, so clients can set `removed`, `createdBy`, and later `organizationId`
- `paginatedList.js` / `filter.js` build `{ [filter]: equal }` from the query string, so clients can query any field and send operator objects (`equal[$ne]=`)
- `search.js` / `paginatedList.js` build `new RegExp(req.query.q)` from raw input, which allows ReDoS and invalid-regex crashes; `fields` is also unvalidated

## Tasks
- [ ] Add a per-entity Joi schema (create + update) next to each controller, as `invoiceController/schemaValidate.js` already does; strip unknown keys
- [ ] Never accept `removed`, `createdBy`, `_id` or `organizationId` from the body
- [ ] Each model lists which fields can be filtered, sorted and searched; reject anything else
- [ ] Escape regex input (`_.escapeRegExp`) and cap `q` length; cast `equal` to a string or ObjectId
- [ ] Cap `items` at a maximum (e.g. 100)

## Acceptance criteria
- `POST /api/client/create` with `removed: true` stores `removed: false`
- `?filter=password&equal[$ne]=x` → 400
- `?q=(a+)+$` does not hang the process

## Files
`backend/src/controllers/middlewaresControllers/createCRUDController/*`
