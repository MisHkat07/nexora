# Nexora

**Nexora** is a modern ERP & CRM platform for managing customers, quotes, invoices, and payments—built with the MERN stack (MongoDB, Express.js, React, Node.js) and Redux.

**Version:** 4.1.0

---

## Brand

| | |
|--------|--------|
| **Product** | Nexora |
| **Mark** | Stylized **N** with upward arrow + 2×2 accent grid |
| **Assets** | `frontend/public/favicon.png`, `frontend/src/style/images/nexora-icon.png`, `frontend/src/style/images/nexora-logo.png` |

### Color palette

| Token | Hex | Use |
|--------|------|--------|
| Primary blue | `#0061FF` | Active nav, primary buttons, links |
| Purple | `#8833FF` | Accents, “updated” states |
| Success | `#00D97E` | Success / online / “new” |
| Warning | `#FD7E14` | Warnings / beta |
| Danger | `#E63757` | Errors / destructive actions |
| Text | `#12263F` | Headings & body |
| Muted | `#6E84A3` | Secondary labels |
| Surface | `#F5F8FC` | App background |
| Border | `#E3EBF6` | Dividers & card edges |

UI theme tokens live in [`frontend/src/locale/Localization.jsx`](frontend/src/locale/Localization.jsx) and [`frontend/src/style/partials/brand.css`](frontend/src/style/partials/brand.css).

---

## Features

### Dashboard & reports
- Monthly invoice, quote, and payment totals
- Unpaid amount and status performance
- Customer counts
- Recent invoices and quotes at a glance

### Customer management
- Create, read, update, and delete customers (clients)
- Store name, country, address, phone, and email

### Sales & invoicing
- Create and manage invoices with line items, tax, and status
- Record payments against an invoice
- Download invoice PDFs
- Send invoices by email
- Support for recurring invoice fields

### Quotes
- Create and manage quotes
- Download quote PDFs and send by email
- Convert a quote into an invoice in one step

### Payments
- Track payments linked to invoices and payment modes
- Download payment PDFs and send by email
- Configure **payment modes** (e.g. cash, wire transfer)
- Configure **taxes** (default 0% tax included after setup)

### Settings & profile
- General, company, logo, currency/money format, and finance settings (document prefixes & numbering)
- Admin profile: update info, upload photo, change password

### Authentication
- Login / logout with JWT
- Forgot password and reset password flow
- Protected API routes for authenticated users

### State management
- Redux Toolkit for predictable, scalable client state

---

## Tech stack

| Layer | Stack |
|--------|--------|
| **Frontend** | React 18, Vite 5, React Router 6, Redux Toolkit, Ant Design 5, Axios |
| **Backend** | Node.js, Express.js, Mongoose |
| **Database** | MongoDB (local or Atlas) |
| **Auth** | JWT, bcrypt |
| **Extras** | PDF (Pug + html-pdf), Resend (email), optional DigitalOcean Spaces / S3 uploads |

---

## Project structure

```
nexora/
├── frontend/          # Nexora SPA (Vite) — default port 3000
├── backend/           # Express API — default port 8888
└── README.md
```

---

## Prerequisites

- **Node.js 20+** (project engines pin `20.9.0`; backend exits if Node major &lt; 20)
- **npm** 10.x recommended
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas)

> **Atlas tip:** Under **Network Access**, allow your current IP (or `0.0.0.0/0` for local development). Resume the cluster if it is paused.

---

## Getting started

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?appName=nexora"
JWT_SECRET="your_private_jwt_secret_key"
PORT=8888
```

Optional (email / cloud uploads):

```env
RESEND_API=
PUBLIC_SERVER_FILE=
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_URL=
DO_SPACES_NAME=
REGION=
```

Seed the database (admin user, settings, default tax & payment mode):

```bash
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

Create `frontend/.env` (local API is used automatically in Vite dev):

```env
VITE_FILE_BASE_URL=http://localhost:8888/
VITE_BACKEND_SERVER=http://localhost:8888/
```

Start the UI:

```bash
npm run dev
```

App runs at `http://localhost:3000` (browser title: **Nexora**).

### Demo login (after `npm run setup`)

| Field | Value |
|--------|--------|
| **Email** | `admin@demo.com` |
| **Password** | `admin123` |

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

### Notes

- Leave `VITE_BACKEND_SERVER` empty for same-origin deploys. Set it (with a trailing `/`) only if the API is hosted on a different domain.
- `FRONTEND_DIST` overrides the path Express serves the UI from.
- Local development: `npm run dev` from the repo root starts the API (8888, nodemon) and the UI (3000, Vite) together; Ctrl+C stops both. Use `npm run dev:backend` or `npm run dev:frontend` to run one on its own.

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

## Backend scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API with Node |
| `npm run setup` | Seed admin, settings, tax, payment mode |
| `npm run reset` | Reset setup data |

---

## Frontend scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (port 3000) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run dev:remote` | Dev against remote backend (`VITE_DEV_REMOTE`) |

---

## API overview

Base URL: `http://localhost:8888/api/`

**Auth**
- `POST /login`
- `POST /forgetpassword`
- `POST /resetpassword`
- `POST /logout` (authenticated)

**Entities** (typical CRUD + helpers): `client`, `invoice`, `quote`, `payment`, `paymentmode`, `taxes`

- `POST /:entity/create`
- `GET /:entity/read/:id`
- `PATCH /:entity/update/:id`
- `DELETE /:entity/delete/:id`
- `GET /:entity/list`, `/search`, `/filter`, `/summary`

**Notable extras**
- Invoice / quote / payment: mail + PDF download
- Quote: `GET /quote/convert/:id` → convert to invoice

PDFs: `GET /download/:directory/:file`

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| Login fails / connection refused | Backend running on port **8888**? |
| `DATABASE` undefined / mongoose URI error | `backend/.env` exists and includes `DATABASE` |
| Atlas TLS / server selection error | Network Access IP allowlist; cluster not paused |
| Empty / invalid login after fresh DB | Run `npm run setup` in `backend/` |

---

## License

Private project — update this section if you publish or redistribute.
