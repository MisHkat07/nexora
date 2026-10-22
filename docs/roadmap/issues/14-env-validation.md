---
title: "Validate env config on boot and add .env.example"
labels: [dx, backend, P1]
milestone: "M1 Foundation & Security"
size: XS
depends_on: []
---
## Tasks
- [ ] A `config.js` that validates env with Joi: `DATABASE`, `JWT_SECRET` (min 32 chars), `PUBLIC_SERVER_FILE`, `RESEND_API`, `CORS_ORIGINS`, storage keys…
- [ ] Fail fast with a clear message; never fall back to insecure defaults in production
- [ ] Add `backend/.env.example` and `frontend/.env.example`; update the README and `render.yaml`

## Acceptance criteria
- Starting without `JWT_SECRET` exits with a helpful error
