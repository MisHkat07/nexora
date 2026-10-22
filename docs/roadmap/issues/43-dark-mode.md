---
title: "Dark mode and theme tokens"
labels: [feature, frontend, ux, P2]
milestone: "M6 UX & AI"
size: S
depends_on: []
---
## Tasks
- [ ] Move the brand palette (`brand.css`, `Localization.jsx` tokens) into antd `ConfigProvider` theme tokens + CSS variables
- [ ] Use antd `darkAlgorithm`; replace hard-coded colors in custom CSS
- [ ] Toggle in the header: light / dark / system, remembered per user

## Acceptance criteria
- Every page is readable in dark mode (contrast ratio at least 4.5:1, the WCAG AA level)
