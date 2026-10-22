---
title: "Mobile-responsive pass and installable PWA"
labels: [feature, frontend, ux, P2]
milestone: "M6 UX & AI"
size: M
depends_on: []
---
## Tasks
- [ ] Audit every page at 375px: DataTable → card list on small screens, forms in one column, sticky action bar
- [ ] Invoice item editor usable on mobile
- [ ] `vite-plugin-pwa`: manifest, icons, offline shell
- [ ] Accessibility pass: keyboard navigation, labels, focus states (axe in Playwright)

## Acceptance criteria
- Create invoice + record payment works on a phone; Lighthouse PWA + a11y ≥ 90
