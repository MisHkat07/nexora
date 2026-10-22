---
title: "Observability: structured logging, error tracking, health checks"
labels: [infra, backend, P1]
milestone: "M1 Foundation & Security"
size: S
depends_on: []
---
## Tasks
- [ ] `pino` + `pino-http` with a request ID on each request; replace the `console.log`s in `server.js`
- [ ] Sentry (backend + frontend), turned on by setting `SENTRY_DSN`
- [ ] `GET /health` (liveness) and `GET /ready` (Mongo connected); set as the health check in `render.yaml`
- [ ] Graceful shutdown on SIGTERM (close the server and the Mongo connection)

## Acceptance criteria
- Logs are JSON in production and readable in dev
- A thrown error shows up in Sentry with the request ID
