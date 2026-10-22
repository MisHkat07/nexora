---
title: "Incremental TypeScript migration"
labels: [tech-debt, dx, P2]
milestone: "M7 Launch"
size: L
depends_on: [11]
---
## Why
As the codebase grows with multi-tenancy, RBAC and new modules, types catch whole classes of bugs early and make onboarding contributors easier.

## Tasks
- [ ] Enable `allowJs` + `checkJs` with a `tsconfig` in both packages; type-check in CI
- [ ] Shared `types` package (or zod schemas) used by the API validation and the frontend forms
- [ ] Convert new modules to TS first; then models → services → controllers; then frontend modules
- [ ] Replace `module-alias` with TS path aliases (`tsx` for dev)

## Acceptance criteria
- CI type-checks the whole repo; all new code is written in TS
