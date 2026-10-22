---
title: "Move uploads and generated PDFs to S3-compatible storage"
labels: [infra, backend, P1]
milestone: "M1 Foundation & Security"
size: M
depends_on: [7]
---
## Why
Logos, avatars and PDFs are written to `src/public/uploads` and `src/public/download`. Render's filesystem is temporary, so files disappear on every deploy, and the app can't run more than one instance. `@aws-sdk/client-s3` is already a dependency (`DoSingleStorage.js`).

## Tasks
- [ ] A `storage` service with `put/get/delete/getSignedUrl`, backed by S3/R2/Spaces, with a local-disk driver for dev
- [ ] Migrate `uploadMiddleware` to it; validate MIME type and size, and generate safe random filenames
- [ ] Stream PDFs directly or cache them in storage keyed by the document's `updated` timestamp
- [ ] Keep one upload library (`multer` or `express-fileupload`)
- [ ] Migration script for existing local files

## Acceptance criteria
- After a redeploy, logos and avatars still load
- Uploading an `.html` file renamed to `.png` is rejected
