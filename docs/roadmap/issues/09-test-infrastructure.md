---
title: "Set up test infrastructure (backend, frontend, E2E)"
labels: [testing, dx, P0]
milestone: "M1 Foundation & Security"
size: M
depends_on: []
---
## Why
There are no tests at all, so every later change in this roadmap is risky.

## Tasks
- [ ] Backend: Jest (or Vitest) + Supertest + `mongodb-memory-server` (replica set mode, for transactions)
- [ ] Make `app.js` importable without connecting/listening (move model registration out of `server.js`)
- [ ] Fixtures/factories: admin, client, invoice, payment, tax, payment mode
- [ ] Frontend: Vitest + React Testing Library + MSW
- [ ] E2E: Playwright smoke test (login → create client → create invoice → record payment → download PDF)
- [ ] `npm test` at the root runs everything

## Acceptance criteria
- `npm test` passes locally with no external services
- There is a short testing section in the README
