---
title: "Secure the /download route (unauthenticated PDF access)"
labels: [security, backend, P0]
milestone: "M1 Foundation & Security"
size: S
depends_on: []
---
## Why
`app.js` mounts `/download` **without** `isValidAuthToken`. `downloadPdf.js` turns the URL directory into any Mongoose model name (`invoice` → `Invoice`, `admin` → `Admin`, …) and generates a PDF for any `_id`. Anyone who has or guesses an ID can download any invoice, quote or payment PDF without logging in.

## Tasks
- [ ] Allow only the `invoice`, `quote` and `payment` directories; return 404 for anything else
- [ ] Require one of: (a) a valid auth token, or (b) a signed, expiring token in the query string (`?t=`), for links in emails and the client portal (#27)
- [ ] Add a `signDownloadUrl(entity, id, ttl)` helper; use it in `sendMail` for invoices, quotes and payments
- [ ] Update the frontend download buttons to send auth or request a signed URL first

## Acceptance criteria
- `GET /download/invoice/invoice-<id>.pdf` without a token → 401
- `GET /download/admin/...` → 404
- A signed link works until it expires, then returns 401
- Covered by API tests (#10)

## Files
`backend/src/app.js`, `backend/src/routes/coreRoutes/coreDownloadRouter.js`, `backend/src/handlers/downloadHandler/downloadPdf.js`
