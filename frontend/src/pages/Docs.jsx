import { Link } from 'react-router-dom';
import { Typography } from 'antd';

const endpoints = [
  ['POST /api/login', 'Sign in. The access token is returned in the body; the refresh cookie is httpOnly.'],
  ['GET /api/invoice/list', 'List invoices for the signed-in organization.'],
  ['POST /api/invoice/mail', 'Email an invoice. Outside tests this is queued for the worker.'],
  ['POST /api/quote/convert/:id', 'Create an invoice from a quote, once.'],
  ['GET /api/portal/:token', 'Public document view. No login.'],
  ['POST /api/portal/:token/accept', 'Accept a quote and convert it.'],
  ['POST /api/portal/:token/pay', 'Pay an invoice. Uses Stripe when configured, otherwise records a test payment.'],
  ['POST /api/webhooks/stripe', 'Stripe events. Requires STRIPE_WEBHOOK_SECRET in production.'],
  ['GET /api/dashboard', 'Revenue, unpaid balance, and pipeline.'],
  ['GET /api/search?q=', 'Customers, invoices, quotes, leads, and products.'],
  ['POST /api/billing/checkout', 'Change plan. Test mode updates the plan when Stripe is not configured.'],
  ['GET /api/compliance/export', 'Download the organization data as JSON.'],
];

export default function Docs() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
      <Typography.Title>Nexora guide</Typography.Title>
      <Typography.Paragraph>
        Create a customer, then a quote or invoice. Emailing a document includes a portal link. Recurring invoices
        and payment reminders run on the worker process (`npm run worker` in the backend). Card payments and
        subscription billing start working when Stripe keys are set. Receipts and drafts use a built-in parser until
        an OpenAI key is added.
      </Typography.Paragraph>
      <Typography.Title level={3}>API</Typography.Title>
      {endpoints.map(([path, text]) => (
        <Typography.Paragraph key={path}>
          <Typography.Text code>{path}</Typography.Text> — {text}
        </Typography.Paragraph>
      ))}
      <Typography.Paragraph>
        Backups are a database concern: take regular MongoDB snapshots. Deleting a workspace marks its records removed
        and suspends the organization; restore from a snapshot if that was a mistake.
      </Typography.Paragraph>
      <Link to="/">Home</Link>
    </main>
  );
}
