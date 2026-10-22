---
title: "Migrate existing data into a default organization"
labels: [backend, saas, migration, P0]
milestone: "M2 SaaS Core"
size: S
depends_on: [15]
---
## Tasks
- [ ] Set up a migration tool (`migrate-mongo`) with up/down scripts in `backend/migrations`
- [ ] Migration: create a default org from the current company settings, then backfill `organizationId` on all documents
- [ ] Run migrations on deploy (Render pre-deploy command)
- [ ] Update `setup/setup.js` to create an org + owner

## Acceptance criteria
- An existing database upgrades with no data loss; the app works afterward
