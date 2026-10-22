---
title: "Use MongoDB transactions for payment create/update/delete"
labels: [bug, backend, data-integrity, P0]
milestone: "M1 Foundation & Security"
size: M
depends_on: [9]
---
## Why
`paymentController/create.js` creates a Payment, then updates the PDF field, then separately `$inc`s the invoice `credit` and recomputes `paymentStatus`. If any step fails, or two payments run at once, invoice balances go wrong. The max-amount check is also read-then-write, so it has a race.

## Tasks
- [ ] Wrap payment create/update/remove in `session.withTransaction()` (Atlas supports this; tests use a `mongodb-memory-server` replica set)
- [ ] Do the over-payment check atomically (conditional update on `credit`)
- [ ] Recompute `paymentStatus` from the stored values, not from the values read earlier
- [ ] Return 400 (not 202) for validation failures

## Acceptance criteria
- Concurrent payments that together exceed the balance: exactly one succeeds
- If the invoice update fails, no orphan Payment is left behind
- Tests cover paid / partially / unpaid transitions
