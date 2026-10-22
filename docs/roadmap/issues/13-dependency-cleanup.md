---
title: "Dependency cleanup and upgrades"
labels: [tech-debt, P2]
milestone: "M1 Foundation & Security"
size: S
depends_on: [9]
---
## Tasks
- [ ] Replace `moment` with `dayjs` (the frontend already uses dayjs)
- [ ] Replace the deprecated `shortid` with `nanoid` / `crypto.randomUUID`
- [ ] Remove the unused `openai` dependency (only read in `server.js`) until AI work (#47) needs an SDK
- [ ] Upgrade: Express 5, latest Mongoose 8.x, Vite 6, ESLint 9 flat config; check React 19 + antd compatibility
- [ ] Remove the committed `.DS_Store`; rename `frontend/temp.env` → `.env.example`

## Acceptance criteria
- `npm audit` shows no high/critical issues; the app and tests still pass
