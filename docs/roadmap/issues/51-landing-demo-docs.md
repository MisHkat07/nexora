---
title: "Marketing site, public demo, docs and API reference"
labels: [gtm, docs, P1]
milestone: "M7 Launch"
size: M
depends_on: [45]
---
## Tasks
- [ ] Landing page: value proposition, feature sections with real screenshots, pricing, FAQ, sign-up call to action (separate static site, e.g. Astro on Vercel)
- [ ] Public demo org with read/write sample data, reset nightly by a job
- [ ] Help center / user docs; changelog page
- [ ] OpenAPI spec generated from the Joi schemas + Swagger UI at `/api/docs`; personal API keys
- [ ] Status page (e.g. Better Stack / Instatus)

## Acceptance criteria
- A visitor can try the demo without signing up; developers can call the API with a key
