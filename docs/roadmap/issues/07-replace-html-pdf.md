---
title: "Replace html-pdf (PhantomJS) with Puppeteer"
labels: [tech-debt, backend, P0]
milestone: "M1 Foundation & Security"
size: M
depends_on: []
---
## Why
`html-pdf` depends on PhantomJS, which has been abandoned since 2018. It has known vulnerabilities, renders modern CSS poorly, and often fails to install on modern Linux images and Render.

## Tasks
- [ ] Render the existing Pug templates (`backend/src/pdf/*.pug`) to HTML, then to PDF with `puppeteer` (or `playwright-core` + `@sparticuz/chromium` for small images)
- [ ] Reuse one browser instance and close pages after each render
- [ ] Return a Buffer/stream instead of writing to `src/public/download` (pairs with #8)
- [ ] Update the Dockerfile to install Chromium dependencies
- [ ] Refresh the invoice and quote templates: logo, brand colors, totals table, payment instructions, pay link / QR (#24)

## Acceptance criteria
- Invoice, quote and payment PDFs render correctly in Docker and on Render
- `html-pdf` is removed from `package.json`
