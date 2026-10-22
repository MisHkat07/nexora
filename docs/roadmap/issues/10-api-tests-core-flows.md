---
title: "API tests for auth, invoice, quote and payment flows"
labels: [testing, backend, P0]
milestone: "M1 Foundation & Security"
size: M
depends_on: [9]
---
## Tasks
- [ ] Auth: login, logout (token removed from `loggedSessions`), forgot/reset password, invalid token
- [ ] Invoice: create (totals computed on the server), update, delete, list pagination, search, summary
- [ ] Quote: create, convert to invoice
- [ ] Payment: create/update/delete and their effect on invoice `credit` and `paymentStatus`
- [ ] Security regression tests for #1–#4
- [ ] Coverage threshold: 60% for `controllers/` to start

## Acceptance criteria
- Tests run in CI (#11) and are green
