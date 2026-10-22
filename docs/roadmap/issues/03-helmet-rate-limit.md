---
title: "Add helmet security headers and rate limiting"
labels: [security, backend, P0]
milestone: "M1 Foundation & Security"
size: S
depends_on: []
---
## Why
`express-rate-limit` is installed but never used. There are no security headers (CSP, HSTS, frame-ancestors), so login and forgot-password can be brute-forced.

## Tasks
- [ ] Add `helmet` with a CSP that works with the Vite build and Google Fonts
- [ ] Strict limiter on `/api/login`, `/api/forgetpassword` and `/api/resetpassword` (e.g. 10 requests / 15 min per IP + email)
- [ ] General API limiter (e.g. 300 requests / min per IP)
- [ ] Set `app.set('trust proxy', 1)` for Render

## Acceptance criteria
- Responses include the helmet headers; the frontend still loads with no CSP errors
- The 11th failed login within 15 min returns 429
