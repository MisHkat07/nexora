---
title: "AI: draft invoices/quotes from plain language"
labels: [feature, fullstack, ai, P1]
milestone: "M6 UX & AI"
size: M
depends_on: [36, 19]
---
## Tasks
- [ ] Provider-agnostic LLM service (Claude via the Anthropic SDK by default), key per deployment, usage metered per org
- [ ] "Describe it" box: *"Quote Acme for 3 months of hosting at $50 and setup fee $200, 15% VAT"* → structured output (client match, items matched to products, tax, dates) → fills the existing form for review (never auto-saves)
- [ ] AI-written email body for sending invoices/quotes and for reminders, in a chosen tone
- [ ] Guardrails: tenant data only, PII handling, prompt-injection-safe tool design, opt-out per org

## Acceptance criteria
- 9 out of 10 test prompts produce a correct draft; the user always confirms before saving
