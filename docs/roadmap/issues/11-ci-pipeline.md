---
title: "GitHub Actions CI: lint, test, build, audit"
labels: [dx, infra, P0]
milestone: "M1 Foundation & Security"
size: S
depends_on: [9]
---
## Tasks
- [ ] Workflow on PRs and pushes to `main`: install (cached), lint (frontend + backend), test, `npm run build`, Docker build
- [ ] `npm audit --audit-level=high` (non-blocking at first)
- [ ] Add a backend ESLint config and a Prettier check
- [ ] Branch protection on `main` requiring CI
- [ ] Dependabot for npm + GitHub Actions

## Acceptance criteria
- A PR shows the CI status; a failing test blocks the merge
