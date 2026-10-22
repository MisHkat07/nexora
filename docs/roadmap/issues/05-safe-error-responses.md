---
title: "Stop leaking internal errors in API responses"
labels: [security, backend, P1]
milestone: "M1 Foundation & Security"
size: S
depends_on: [12]
---
## Why
Many handlers (for example `isValidAuthToken.js`) return `error: error` and `error.message` to the client, exposing internals and DB details. An invalid JWT currently returns 500 instead of 401.

## Tasks
- [ ] Central error handler: map known errors (Joi, CastError, JWT) to 4xx with safe messages; everything else → 500 `"Internal error"` plus a request ID
- [ ] Remove `error: error` from all `res.json` calls
- [ ] Log full errors server-side with the request ID (#12)
- [ ] An invalid or expired JWT → 401

## Acceptance criteria
- No response body contains a stack trace or a raw Mongo error
- The frontend still shows user-friendly messages
