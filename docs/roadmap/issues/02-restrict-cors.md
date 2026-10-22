---
title: "Restrict CORS to configured origins"
labels: [security, backend, P0]
milestone: "M1 Foundation & Security"
size: XS
depends_on: []
---
## Why
`cors({ origin: true, credentials: true })` in `app.js` reflects **any** origin and allows credentials, so any website can make authenticated cross-origin requests.

## Tasks
- [ ] Add a `CORS_ORIGINS` env var (comma-separated) and allow only those origins
- [ ] In single-server mode (frontend served by the backend), allow same-origin only by default
- [ ] Document it in `.env.example` (#14)

## Acceptance criteria
- A request from an origin that isn't listed gets no `Access-Control-Allow-Origin` header
- Local dev (`npm run dev`) still works
