# Nexora

**Nexora** is an ERP & CRM platform for managing customers, quotes, invoices, and payments — built with the MERN stack (MongoDB, Express, React, Node.js).

**Version:** 4.1.0 · **Roadmap:** [`docs/roadmap/README.md`](docs/roadmap/README.md)

---

## Roadmap status

The plan to make Nexora a market-ready SaaS is split into 7 milestones and 55 issues ([details](docs/roadmap/README.md), one file per issue in [`docs/roadmap/issues/`](docs/roadmap/issues)).

| Milestone | Goal | Status |
|---|---|---|
| **M1 Foundation & Security** | Safe for real customer data, tested, deploys reliably | ✅ Done (branch `m1/foundation-security`) |
| M2 SaaS Core | Many companies and users per deployment, roles, audit log | In progress — #15 multi-tenancy ✅, #16 data migration ✅, #17 self-serve signup ✅ |
| M3 Get Paid | Online payments, recurring invoices, client portal, reminders, email sending, quote → invoice | In progress — #54 email ✅, #55 quote → invoice ✅ (branch `m3/email-and-quote-conversion`) |
| M4 CRM | Contacts, leads → deals pipeline, activities, import | Planned |
| M5 ERP | Products, inventory, expenses, purchase orders, reports | Planned |
| M6 UX & AI | Analytics dashboard, search, dark mode, notifications, AI features | Planned |
| M7 Launch | Subscriptions, marketing site, API docs, compliance | Planned |

### What Milestone 1 changed

**Security**
- PDF downloads need a short-lived link signed for one document (`/download` was public before).
- CORS only allows configured origins; `helmet` security headers; rate limits on login and password reset.
- Every create/update/list/search request is checked against a per-model allowlist (no mass assignment, no NoSQL or regex injection, page size capped).
- Error responses never include stack traces or database errors; each 500 carries a request ID.
- Password reset tokens are random, stored hashed, single-use and expire after 1 hour; a reset or password change signs out other sessions.
- Login and forgot-password don't reveal whether an email has an account.
- Uploads: only PNG/JPEG/GIF/WebP (checked from the file bytes, not the name), 5 MB limit, random file names.

**Reliability**
- Payments and invoice balances are written in one MongoDB transaction, so concurrent payments can't overpay an invoice.
- PDFs are rendered by headless Chrome (Puppeteer) instead of the abandoned PhantomJS.
- Uploads can live in any S3-compatible bucket, so they survive redeploys.
- The server validates its configuration on startup, logs structured JSON with request IDs, exposes `/health` and `/ready`, and shuts down cleanly.

**Engineering**
- 87 backend API tests, GitHub Actions CI (lint, tests, build, Docker image, dependency audit), Dependabot.
- Dependencies upgraded (Express 5, React 19, React Router 7, Vite 6, ESLint 9, Puppeteer 25); `npm audit --omit=dev` reports 0 vulnerabilities in both apps.
- Optional Sentry error tracking for backend and frontend.

---

## Features

✅ works · 🚧 not implemented yet (tracked in the roadmap)

### Dashboard
- ✅ Invoice, quote and payment totals, unpaid amount, status breakdown, customer counts
- ✅ Recent invoices and quotes
- 🚧 Totals are all-time although the cards say "This Month" (#41)

### Customers
- ✅ Create, read, update, delete and search customers (name, country, address, phone, email)

### Invoices & quotes
- ✅ Line items, tax, status; totals are always computed on the server
- ✅ PDF download
- ✅ Send invoices, quotes and payment receipts by email: PDF attached, a 7-day download link, optional CC and personal message; drafts become "sent" and every send is recorded on the document
- ✅ Convert a quote into an invoice in one click (once per quote; the quote is marked accepted and the new invoice opens)
- 🚧 Recurring invoices — the field exists, no scheduler yet (#25)

### Payments
- ✅ Record, edit and delete payments against an invoice; the invoice balance and paid / partially / unpaid status update automatically
- ✅ Payment modes and taxes
- ✅ Payment receipt PDF

### Settings & profile
- ✅ Company details, logo, currency and number formats, document prefixes and numbering
- ✅ Profile with photo upload and password change

### Authentication
- ✅ Login / logout (JWT), forgot and reset password
- ✅ Self-serve signup at `/register` when `SIGNUP_ENABLED=true`: creates a new organization with its owner and defaults, logs them in, and emails a confirmation link (24 h). Until confirmed, the account works but can't email customers.

---

## Tech stack

| Layer | Stack |
|--------|--------|
| **Frontend** | React 19, Vite 6, React Router 7, Redux Toolkit, Ant Design 5, Axios |
| **Backend** | Node.js 20.19+, Express 5, Mongoose 8 |
| **Database** | MongoDB (Atlas or a local replica set — transactions need a replica set) |
| **PDF** | Pug templates rendered by headless Chrome (Puppeteer) |
| **Files** | Local disk (development) or any S3-compatible bucket |
| **Email** | Resend |
| **Monitoring** | pino structured logs, optional Sentry |

### Backend packages

| Package | Used for | Why this one |
|---|---|---|
| `express` 5 | HTTP server and routing | Standard Node web framework; v5 forwards async errors and has a safer router |
| `mongoose` | MongoDB models, validation, transactions | Schemas and validation on top of MongoDB, and session support for transactions |
| `mongoose-autopopulate` | Loads related documents (e.g. an invoice's client) automatically | Keeps the many read endpoints short |
| `joi` | Validates request bodies, query parameters and environment variables | One declarative schema per input; unknown fields are rejected by default |
| `jsonwebtoken` | Login session tokens and 5-minute signed PDF download links | Stateless, signed tokens; each session token has a unique ID so it can be revoked |
| `bcryptjs` | Password hashing | Slow, salted hashing; pure JavaScript, so nothing native to compile |
| `helmet` | Security headers (CSP, HSTS, frame and MIME protections) | Sensible defaults in one middleware |
| `cors` | Allows only the origins in `CORS_ORIGINS` to call the API from a browser | Standard Express CORS middleware |
| `express-rate-limit` | Brute-force protection on login and password reset; general API limit | Simple in-memory limiter, enough for a single instance |
| `compression` | gzip responses | Smaller JSON and frontend assets |
| `multer` 2 | Parses file uploads into memory before they are checked and stored | Maintained multipart parser; v2 fixes denial-of-service advisories |
| `@aws-sdk/client-s3` | Stores uploads in S3, Cloudflare R2, DigitalOcean Spaces or MinIO | One client for every S3-compatible provider |
| `transliteration` | Turns uploaded file names in any language into safe ASCII | Keeps non-English names readable in URLs |
| `puppeteer` 25 | Renders invoice, quote and payment PDFs in headless Chrome | Modern CSS and fonts; replaces the abandoned PhantomJS (`html-pdf`) |
| `pug` | HTML templates for the PDFs | Already used by the existing templates |
| `currency.js` | Money arithmetic (totals, tax, balances) | Avoids floating-point rounding errors such as 0.1 + 0.2 |
| `dayjs` | Dates in PDFs and dashboard summaries | Small, maintained replacement for `moment` |
| `lodash` | Escaping user search text before it is used in a regex | `escapeRegExp` prevents regex injection |
| `resend` | Sends password-reset emails and invoice / quote / receipt emails with the PDF attached | Simple transactional email API with attachments; delivery errors are reported back to the user |
| `pino`, `pino-http` | JSON request and error logs with request IDs | Fast structured logging that log platforms can search |
| `@sentry/node` | Error tracking (when `SENTRY_DSN` is set) | Groups errors with stack traces and the deployed commit; sensitive data is scrubbed |
| `dotenv` | Loads `backend/.env` | Standard local configuration |
| `module-alias` | `@/…` import paths inside `src/` | Avoids long `../../..` paths |
| `glob` | Finds and registers every model and controller on startup | Lets new models be added without editing a central list |

**Backend dev tools**

| Package | Used for |
|---|---|
| `jest`, `supertest` | API tests that send real HTTP requests to the app |
| `mongodb-memory-server` | A throwaway MongoDB replica set for each test run (no database setup needed) |
| `aws-sdk-client-mock`, `@smithy/util-stream` | Tests the S3 storage driver without a real bucket |
| `eslint`, `@eslint/js`, `globals` | Linting (ESLint 9 flat config) |
| `nodemon` | Restarts the API on file changes during development |
| `pino-pretty` | Readable, colored logs in development |

### Frontend packages

| Package | Used for | Why this one |
|---|---|---|
| `react` 19, `react-dom` | UI | Current React |
| `vite` 6, `@vitejs/plugin-react` | Dev server and production build | Fast builds and hot reload |
| `antd` 5, `@ant-design/icons` | UI components (tables, forms, modals, notifications) | Complete business UI kit; the existing screens use it |
| `@ant-design/v5-patch-for-react-19` | Makes antd 5's notifications, modals and wave effects work on React 19 | Official compatibility patch from the antd team |
| `@ant-design/pro-layout` | Page headers | Used by the existing list and detail pages |
| `react-router-dom` 7 | Client-side routing | Same API as v6 for this app, with security fixes |
| `@reduxjs/toolkit`, `react-redux`, `redux`, `reselect` | App state (lists, current record, settings, auth) | Existing state management; toolkit reduces boilerplate |
| `axios` | API requests (adds the auth header, shows error notifications) | Interceptors and multipart uploads |
| `currency.js` | Money formatting and line-item totals in forms | Same rounding as the backend |
| `dayjs` | Date pickers and date formatting | antd's date library |
| `@sentry/react` | Browser error tracking and the crash fallback screen (when `VITE_SENTRY_DSN` is set) | Same tool as the backend |
| `cross-env` | Sets env variables in npm scripts on any OS | Used by `npm run dev:remote` |

**Frontend dev tools:** `eslint` 9 with `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` and `eslint-plugin-unused-imports` (unused imports are removed by `npm run lint -- --fix`), `prettier`.

### Removed in Milestone 1 (and why)

| Package | Reason |
|---|---|
| `html-pdf` | Depends on PhantomJS, abandoned since 2018, with known vulnerabilities |
| `moment` | In maintenance mode; replaced by `dayjs` |
| `shortid` | Deprecated and not cryptographically random; replaced by `crypto.randomUUID` and stable React keys |
| `openai`, `node-cache`, `cookie-parser`, `express-fileupload`, `react-quill`, `just-compare` | Installed but never used (`react-quill` also carried a vulnerable Quill 1.x) |

---

## Multi-tenancy (how data is separated between companies)

One deployment serves many companies (**organizations**). Every business record — customers, invoices, quotes,
payments, payment modes, taxes, settings, uploads and users — has an `organizationId`, and a user only ever sees
their own organization's data.

**How it works** (`backend/src/tenancy/`)
- `plugin.js` is applied to every business model. It adds `organizationId` to every query, update, count,
  aggregation and bulk write, stamps it on new documents, and refuses to change it afterwards.
- `context.js` keeps the current organization per request (Node `AsyncLocalStorage`). The auth middleware sets it
  from the logged-in user, so controllers don't pass it around.
- **Fail closed:** inside an HTTP request, a query on a business model with no organization throws instead of
  returning everyone's data.
- Signed PDF links carry their organization, so downloads without a login are still scoped.
- A user's email is unique across all organizations (login finds the account, then its organization).

**When writing code**
- In request handlers: nothing to do, just query as usual.
- Before the user is known (login, password reset): wrap the user lookup in `withoutTenant(() => …)`.
- Background jobs, scripts, webhooks: run as an organization with `withTenant(organizationId, () => …)`, or pass
  `organizationId` explicitly when creating documents.
- New models that hold business data: add `schema.plugin(require('../../tenancy/plugin'))`.

**Existing installs:** on startup the server assigns any record without an organization to a default one created
from your company settings (`tenancy/migrate.js`, also available as `npm run migrate:tenancy`). It's safe to run repeatedly.

`backend/tests/tenancy.test.js` checks that one company can't read, list, search, update, delete, pay, email,
convert or download another company's records.

---

## Project structure

```
nexora/
├── backend/                 # Express API — default port 8888
│   ├── src/
│   │   ├── controllers/     # Request handlers (generic CRUD + per-entity overrides)
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API, download and public-file routes
│   │   ├── storage/         # Local disk / S3 file storage
│   │   ├── tenancy/         # Organization scoping (plugin, request context, migration)
│   │   ├── pdf/             # Pug templates for PDFs
│   │   ├── config.js        # Environment validation
│   │   └── server.js        # Entry point
│   └── tests/               # Jest + Supertest API tests
├── frontend/                # React SPA (Vite) — default port 3000
├── docs/roadmap/            # Milestones and one file per issue
├── scripts/                 # create-github-issues.sh (pushes roadmap issues to GitHub)
├── .github/                 # CI workflow and Dependabot
├── Dockerfile               # Single image: API + built frontend + Chromium
└── render.yaml              # Render blueprint
```

---

## Prerequisites

- **Node.js 20.19+** (required by Sentry 11; the backend exits on Node < 20)
- **npm** 10.x
- **MongoDB** — [MongoDB Atlas](https://www.mongodb.com/atlas) or a local **replica set** (payments use transactions, which a standalone `mongod` doesn't support)

> **Atlas tip:** Under **Network Access**, allow your current IP (or `0.0.0.0/0` for local development). Resume the cluster if it is paused.

---

## Getting started

### 1. Backend

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and fill in at least:

```env
DATABASE="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?appName=nexora"
JWT_SECRET="at-least-32-random-characters"   # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
PORT=8888
```

The server validates its configuration on startup and exits with a clear message if something required is missing.
In production `JWT_SECRET` must be at least 32 characters, and browsers may only call the API from the same origin
unless you list others in `CORS_ORIGINS`.

Optional (email, cloud uploads, error tracking) — all documented in `backend/.env.example`:

```env
RESEND_API=
EMAIL_FROM="Acme Billing <billing@acme.com>"   # domain verified in Resend
APP_URL=https://your-app.example.com            # links in emails point here

# Uploaded logos and photos. "local" is fine for development; in production use any
# S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces). The bucket can be private.
STORAGE_DRIVER=s3
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # leave empty for AWS

SENTRY_DSN=

# Allow anyone to create a new organization at /register (SaaS mode). Off by default.
SIGNUP_ENABLED=false
```

After switching an existing install to S3, copy the current uploads once with `npm run storage:migrate` (inside `backend/`).

Seed the database (admin user, settings, default tax & payment mode):

```bash
# Real install: choose your own login
SETUP_COMPANY_NAME='Acme Ltd' SETUP_ADMIN_EMAIL=you@company.com SETUP_ADMIN_PASSWORD='a-strong-password' npm run setup

# Demo install: admin@demo.com / admin123
npm run setup
```

Start the API:

```bash
npm run dev
# or: npm start
```

API runs at `http://localhost:8888`.

### 2. Frontend

```bash
cd frontend
npm install
```

Optionally copy `frontend/.env.example` to `frontend/.env`. In Vite dev mode the local API is used automatically.

```env
VITE_FILE_BASE_URL=http://localhost:8888/
VITE_BACKEND_SERVER=http://localhost:8888/
VITE_SENTRY_DSN=
```

Start the UI:

```bash
npm run dev
```

App runs at `http://localhost:3000`. From the repo root, `npm run dev` starts the API and the UI together.

### Demo login (after `npm run setup` without SETUP_ADMIN_*)

| Field | Value |
|--------|--------|
| **Email** | `admin@demo.com` |
| **Password** | `admin123` |

Change this password in **Profile** after logging in. With `DEMO_MODE=true` (public demo sites) the demo account's password is locked.

---

## Testing

```bash
npm test          # from the repo root, or `npm test` inside backend/
npm run lint      # inside backend/ or frontend/
```

Backend API tests use Jest + Supertest against an in-memory MongoDB replica set (`mongodb-memory-server`),
so no database or `.env` is needed. The first run downloads a MongoDB binary (~100 MB) and Chrome for Puppeteer, and caches them.

- `backend/tests/helpers/app.js` gives each test file its own fresh database
- `backend/tests/helpers/factories.js` creates admins (and logs in), clients and invoices

CI (`.github/workflows/ci.yml`) runs on every pull request: backend lint and tests, frontend lint and build,
a Docker image build, and `npm audit` (fails on high-severity production advisories).

---

## Deployment (single server)

In production the backend serves the built frontend from `frontend/dist`, so the API and UI share one origin and one port — no CORS or separate frontend host needed.

### Node host (Render, Railway, VPS, etc.)

From the repo root:

```bash
npm install        # installs backend + frontend deps
npm run build      # builds frontend → frontend/dist
npm start          # starts Express on $PORT (default 8888), serving API + UI
```

Set the backend env vars (`DATABASE`, `JWT_SECRET`, optional extras) in the host's dashboard. Run `npm run setup` once against a fresh database.

### Docker

```bash
docker build -t nexora .
docker run -p 8888:8888 -e DATABASE="mongodb+srv://..." -e JWT_SECRET="..." nexora
```

The image includes Chromium and Noto fonts for PDF rendering and runs as the non-root `node` user.

### Render checklist

- `render.yaml` sets up the service; the health check is `/health`.
- Set `DATABASE`, then `STORAGE_DRIVER=s3` with the `S3_*` keys — without a bucket, uploaded logos and photos are lost on every deploy (the server logs a warning).
- Email (password reset, sending documents): `RESEND_API`, `EMAIL_FROM` and `APP_URL` (the service's public URL).
- Optional: `SENTRY_DSN`.

### Notes

- Leave `VITE_BACKEND_SERVER` empty for same-origin deploys. Set it (with a trailing `/`) only if the API is hosted on a different domain, and add that frontend's origin to `CORS_ORIGINS`.
- `FRONTEND_DIST` overrides the path Express serves the UI from.

---

## Main modules (UI routes)

| Module | Path |
|--------|------|
| Dashboard | `/` |
| Customers | `/customer` |
| Invoices | `/invoice` |
| Quotes | `/quote` |
| Payments | `/payment` |
| Payment modes | `/payment/mode` |
| Taxes | `/taxes` |
| Settings | `/settings` |
| Profile | `/profile` |

Auth routes: `/login`, `/forgetpassword`, `/resetpassword/:userId/:resetToken`.

---

## Scripts

| Where | Script | Description |
|--------|--------|-------------|
| root | `npm run dev` | API (nodemon) and UI (Vite) together |
| root | `npm run build` / `npm start` | Build the UI / start the API serving it |
| root | `npm test` | Backend tests |
| backend | `npm run setup` | Create an organization with its owner, settings, tax and payment mode (`SETUP_COMPANY_NAME`, `SETUP_ADMIN_EMAIL`, `SETUP_ADMIN_PASSWORD`) |
| backend | `npm run reset` | Delete all organizations, users and settings (development only; refuses in production) |
| backend | `npm run migrate:tenancy` | Assign records without an organization to a default one (also runs on startup) |
| backend | `npm run storage:migrate` | Copy local uploads to the S3 bucket |
| backend | `npm run lint` | ESLint |
| frontend | `npm run dev` | Vite dev server (port 3000) |
| frontend | `npm run build` / `npm run preview` | Production build / preview it |
| frontend | `npm run lint` | ESLint (`-- --fix` removes unused imports) |
| frontend | `npm run dev:remote` | Dev against a remote backend (`VITE_DEV_REMOTE`) |

---

## API overview

Base URL: `http://localhost:8888/api/` — every route except auth needs `Authorization: Bearer <token>`.

**Auth** (rate limited)
- `POST /login`
- `POST /forgetpassword`
- `POST /resetpassword`
- `POST /logout`
- `GET /public-config` → `{ signupEnabled }`
- `POST /register` `{ companyName, name, email, password, country? }` (only with `SIGNUP_ENABLED=true`; 5 per hour per IP)
- `POST /verify-email` `{ userId, token }`, `POST /resend-verification` (logged in)

**Entities**: `client`, `invoice`, `quote`, `payment`, `paymentmode`, `taxes`

- `POST /:entity/create`
- `GET /:entity/read/:id`
- `PATCH /:entity/update/:id`
- `DELETE /:entity/delete/:id`
- `GET /:entity/list` (`page`, `items` ≤ 100, `filter`/`equal`, `q`/`fields`, `sortBy`/`sortValue` — only allowlisted fields)
- `GET /:entity/listAll`, `/search`, `/filter`, `/summary`

**Documents**
- `GET /invoice|quote|payment/download-link/:id` → a 5-minute signed URL; open it to download the PDF
- `POST /invoice|quote|payment/mail` `{ id, to?, cc?, message? }` → emails the document (PDF attached) to the customer
- `POST /quote/convert/:id` → creates the invoice (or returns the existing one if already converted)

**Other**
- `GET /health`, `GET /ready` — liveness and readiness probes (no auth)
- `GET /public/uploads/:entity/:file` — uploaded images

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Server exits with "Invalid environment configuration" | The message lists the missing or invalid variables; see `backend/.env.example` |
| Login fails / connection refused | Backend running on port **8888**? |
| Atlas TLS / server selection error | Network Access IP allowlist; cluster not paused |
| Recording a payment or converting a quote fails with a transaction error | MongoDB must be a replica set (Atlas always is); the server logs a warning at startup |
| "Email is not set up on the server" | Set `RESEND_API`, `EMAIL_FROM` and `APP_URL` |
| "The email could not be sent: …" | The message comes from Resend — usually the sender domain isn't verified |
| Empty / invalid login after fresh DB | Run `npm run setup` in `backend/` |
| Logos disappear after deploy | Set `STORAGE_DRIVER=s3` and the bucket keys |
| PDF download fails in Docker | Chromium is installed in the image; check the logs for the request ID |

---

## License

Private project — update this section if you publish or redistribute.
