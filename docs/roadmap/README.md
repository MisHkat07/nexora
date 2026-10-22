# Nexora Roadmap: from invoicing app to market-ready ERP/CRM SaaS

**Goal:** turn Nexora from a single-company invoicing tool into a secure, multi-tenant ERP/CRM SaaS that small businesses would pay for. Its pitch: *quote → invoice → get paid online*, with a real sales pipeline, inventory and AI help.

Each item below is a ready-to-file issue in [`issues/`](issues). Push them to GitHub with:

```bash
gh auth login                                  # once
scripts/create-github-issues.sh --dry-run      # preview
scripts/create-github-issues.sh                # create labels, milestones, issues
```

**Sizes:** XS < ½ day · S 1–2 days · M 3–5 days · L 1–2 weeks (one developer)
**Priority:** P0 must-have for launch · P1 strongly expected by buyers · P2 differentiator / polish

---

## Milestones

| # | Milestone | Outcome | Est. (solo) |
|---|---|---|---|
| M1 | Foundation & Security | Safe to put real customer data in; tested; deploys reliably | ~6 wks |
| M2 | SaaS Core | Many companies, many users, roles, on one deployment | ~8 wks |
| M3 | Get Paid | Online payments, recurring invoices, client portal, reminders | ~7 wks |
| M4 | CRM | Leads → deals pipeline, contacts, activities, import | ~5 wks |
| M5 | ERP | Products, inventory, expenses, purchase orders, financial reports | ~6 wks |
| M6 | UX & AI | Modern dashboard, search, dark mode, notifications, AI features | ~7 wks |
| M7 | Launch | Subscriptions, marketing site, docs/API, compliance | ~5 wks |

The milestones overlap. With 2–3 developers, M4, M5 and M6 can run in parallel once M2 is done.

### Launch-ready cut (≈ 4–5 months solo)
You don't need all 55 issues to start selling. This subset is enough to launch:

**M1:** all · **M2:** 15–20, 23 · **M3:** 24–28, 54, 55 · **M4:** 31, 32 · **M5:** 36 · **M6:** 41, 45 · **M7:** 50–52

Everything else ships after launch, guided by customer feedback.

---

## Critical path

```
09 tests ─┬─ 10 API tests ── 11 CI
          └─ 06 payment transactions ──────────────┐
01–05 security fixes ── 04 ── 15 multi-tenancy ─┬── 19 RBAC ── 18 team ── 50 billing
                                                ├── 17 signup ── 45 onboarding ── 51 launch site
                                                └── 23 org settings
12 observability ── 26 job queue ─┬─ 24 online payments ── 27 client portal
                                  ├─ 25 recurring
                                  └─ 28 reminders
36 products ── 37 inventory / 39 POs     38 expenses ── 40 reports ── 41 dashboard ── 49 AI assistant
```

The work on **#15 (tenant scoping)** gets harder the longer it waits, because every new model and query adds to it. Do it right after M1, before building new modules.

---

## M1 — Foundation & Security
*Exit criteria: no known security holes, CI green with tests on the main flows, PDFs and uploads survive a redeploy.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [01](issues/01-secure-download-route.md) | Secure the `/download` route (unauthenticated PDF access) | S | P0 |
| [02](issues/02-restrict-cors.md) | Restrict CORS to configured origins | XS | P0 |
| [03](issues/03-helmet-rate-limit.md) | Add helmet security headers and rate limiting | S | P0 |
| [04](issues/04-crud-input-hardening.md) | Harden generic CRUD (mass assignment, NoSQL and regex injection) | M | P0 |
| [05](issues/05-safe-error-responses.md) | Stop leaking internal errors in API responses | S | P1 |
| [06](issues/06-payment-transactions.md) | MongoDB transactions for payments | M | P0 |
| [07](issues/07-replace-html-pdf.md) | Replace html-pdf (PhantomJS) with Puppeteer | M | P0 |
| [08](issues/08-object-storage.md) | Uploads and PDFs to S3-compatible storage | M | P1 |
| [09](issues/09-test-infrastructure.md) | Test infrastructure (backend, frontend, E2E) | M | P0 |
| [10](issues/10-api-tests-core-flows.md) | API tests for auth, invoice, quote, payment | M | P0 |
| [11](issues/11-ci-pipeline.md) | GitHub Actions CI | S | P0 |
| [12](issues/12-observability.md) | Logging, Sentry, health checks | S | P1 |
| [13](issues/13-dependency-cleanup.md) | Dependency cleanup and upgrades | S | P2 |
| [14](issues/14-env-validation.md) | Env validation and `.env.example` | XS | P1 |

## M2 — SaaS Core
*Exit criteria: a stranger can sign up, invite a teammate with a limited role, and never see another company's data.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [15](issues/15-organization-tenant-scoping.md) | Organization model + automatic tenant scoping | L | P0 |
| [16](issues/16-tenant-data-migration.md) | Migrate existing data into a default organization | S | P0 |
| [17](issues/17-self-serve-signup.md) | Self-serve signup with email verification | M | P0 |
| [18](issues/18-team-users-invites.md) | Team members: invite, manage, deactivate | M | P0 |
| [19](issues/19-rbac.md) | Role-based access control | L | P0 |
| [20](issues/20-session-refresh-tokens.md) | Secure sessions with refresh tokens | M | P1 |
| [21](issues/21-two-factor-auth.md) | Two-factor authentication | M | P2 |
| [22](issues/22-audit-log.md) | Audit log | M | P1 |
| [23](issues/23-per-org-settings.md) | Per-organization settings and branding | M | P1 |

## M3 — Get Paid
*Exit criteria: a client receives an invoice email, opens the portal, pays by card, and the invoice is marked paid automatically.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [24](issues/24-online-payments-stripe.md) | Online invoice payments + webhooks | L | P0 |
| [25](issues/25-recurring-invoices.md) | Recurring invoice scheduler | M | P1 |
| [26](issues/26-background-jobs.md) | Background job queue | M | P1 |
| [27](issues/27-client-portal.md) | Client portal: view, accept, pay | L | P1 |
| [28](issues/28-payment-reminders.md) | Automatic payment reminders | M | P1 |
| [29](issues/29-credit-notes-refunds.md) | Credit notes and refunds | M | P2 |
| [30](issues/30-multi-currency.md) | Multi-currency with exchange rates | M | P2 |
| [54](issues/54-real-email-sending.md) | Implement document email sending (currently a stub) | M | P0 |
| [55](issues/55-quote-to-invoice-conversion.md) | Implement quote → invoice conversion (currently a stub) | S | P0 |

## M4 — CRM
*Exit criteria: a sales rep manages their week (leads, deals, follow-ups) entirely in Nexora.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [31](issues/31-contacts.md) | Contacts: multiple people per customer | M | P1 |
| [32](issues/32-leads-deals-pipeline.md) | Leads and deals pipeline (Kanban) | L | P0 |
| [33](issues/33-activities-timeline.md) | Activities and customer timeline | L | P1 |
| [34](issues/34-tags-custom-fields.md) | Tags, custom fields, saved views | M | P2 |
| [35](issues/35-import-export.md) | CSV/Excel import and export | M | P1 |

## M5 — ERP
*Exit criteria: the owner sees real profit, stock levels and receivables aging without a spreadsheet.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [36](issues/36-products-catalog.md) | Products and services catalog | M | P0 |
| [37](issues/37-inventory.md) | Inventory: stock, movements, warehouses | L | P1 |
| [38](issues/38-vendors-expenses.md) | Vendors and expenses | M | P1 |
| [39](issues/39-purchase-orders.md) | Purchase orders and bills | M | P2 |
| [40](issues/40-financial-reports.md) | Financial reports (P&L, AR aging, tax) | L | P1 |

## M6 — UX & AI
*Exit criteria: the product looks and feels like a modern SaaS product, and its AI features save users real time.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [41](issues/41-dashboard-analytics.md) | Dashboard redesign with real analytics | M | P1 |
| [42](issues/42-global-search-command-palette.md) | Global search + Ctrl/Cmd+K palette | M | P2 |
| [43](issues/43-dark-mode.md) | Dark mode and theme tokens | S | P2 |
| [44](issues/44-notifications.md) | Notification center, real-time | M | P2 |
| [45](issues/45-onboarding.md) | Onboarding checklist and sample data | S | P1 |
| [46](issues/46-mobile-pwa.md) | Mobile pass + PWA + accessibility | M | P2 |
| [47](issues/47-ai-document-drafting.md) | AI: draft invoices/quotes from plain language | M | P1 |
| [48](issues/48-ai-receipt-capture.md) | AI: receipt capture into expenses | M | P2 |
| [49](issues/49-ai-assistant.md) | AI assistant over business data | L | P2 |

## M7 — Launch
*Exit criteria: people can find the product, try it, pay for it and trust it.*

| # | Issue | Size | Pri |
|---|---|---|---|
| [50](issues/50-subscription-billing.md) | SaaS plans and subscription billing | L | P1 |
| [51](issues/51-landing-demo-docs.md) | Marketing site, demo, docs, API reference | M | P1 |
| [52](issues/52-compliance-legal.md) | Legal pages, data export/deletion, backups | M | P1 |
| [53](issues/53-typescript-migration.md) | Incremental TypeScript migration | L | P2 |

---

## Working agreements
- **One issue → one PR**, with tests. CI must be green before merging (once #11 lands).
- **Every new model** gets `organizationId` + tenant plugin (after #15), a Joi schema (#4), and permissions (#19).
- **Money changes** (payments, credits, stock) always run in a transaction (#6).
- **Feature flags** for half-finished modules so `main` can always be deployed.
- Review this roadmap at the end of every milestone; reorder M4–M6 based on what customers ask for.
