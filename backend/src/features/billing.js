const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { currentTenant } = require('@/tenancy/context');

const PLANS = {
  free: { invoicesPerMonth: 20, seats: 2 },
  starter: { invoicesPerMonth: 200, seats: 5 },
  pro: { invoicesPerMonth: Infinity, seats: Infinity },
};

const loadOrg = () => mongoose.model('Organization').findById(currentTenant()).exec();

/** Plan caps apply only after signup sets a subscription status. Older workspaces stay unlimited. */
const limitsFor = (org) => {
  if (!org?.subscriptionStatus) return null;
  return PLANS[org.plan] || PLANS.free;
};

const assertInvoiceAllowed = async () => {
  const org = await loadOrg();
  const limits = limitsFor(org);
  if (!limits || !Number.isFinite(limits.invoicesPerMonth)) return;
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const count = await mongoose.model('Invoice').countDocuments({ removed: false, created: { $gte: start } });
  if (count >= limits.invoicesPerMonth) {
    throw new HttpError(402, `The ${org.plan} plan includes ${limits.invoicesPerMonth} invoices a month.`);
  }
};

const assertSeatAllowed = async () => {
  const org = await loadOrg();
  const limits = limitsFor(org);
  if (!limits || !Number.isFinite(limits.seats)) return;
  const seats = await mongoose.model('Admin').countDocuments({ removed: false });
  if (seats >= limits.seats) {
    throw new HttpError(402, `The ${org.plan} plan includes ${limits.seats} people.`);
  }
};

/** Blocks writes once a failed payment's grace period has ended. Billing and settings stay open. */
const subscriptionGate = async (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const url = req.originalUrl || '';
  if (/\/(billing|setting|auth|logout|organization)/.test(url)) return next();
  const org = await loadOrg();
  if (org?.subscriptionStatus === 'past_due' && org.graceUntil && org.graceUntil < new Date()) {
    return res.status(402).json({
      success: false,
      result: null,
      message: 'This workspace is read-only until the subscription is updated.',
    });
  }
  return next();
};

const summary = async (req, res) => {
  const org = await loadOrg();
  const limits = limitsFor(org) || PLANS[org?.plan] || PLANS.free;
  const people = await mongoose.model('Admin').countDocuments({ removed: false });
  return res.status(200).json({
    success: true,
    result: {
      plan: org?.plan || 'free',
      subscriptionStatus: org?.subscriptionStatus || null,
      trialEndsAt: org?.trialEndsAt || null,
      graceUntil: org?.graceUntil || null,
      limits: {
        invoicesPerMonth: Number.isFinite(limits.invoicesPerMonth) ? limits.invoicesPerMonth : null,
        seats: Number.isFinite(limits.seats) ? limits.seats : null,
      },
      people,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    message: '',
  });
};

const checkout = async (req, res) => {
  const plan = req.body?.plan;
  if (!PLANS[plan] || plan === 'free') throw new HttpError(400, 'Choose starter or pro.');
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
  if (!secret || !price) {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(503, 'Subscription billing is not configured yet.');
    }
    await mongoose.model('Organization').updateOne(
      { _id: currentTenant() },
      { $set: { plan, subscriptionStatus: 'active' }, $unset: { graceUntil: 1 } }
    );
    return res.status(200).json({
      success: true,
      result: { provider: 'test', plan },
      message: 'Plan updated. Connect Stripe to charge cards.',
    });
  }
  const body = new URLSearchParams({
    mode: 'subscription',
    success_url: `${process.env.APP_URL || ''}/billing?paid=1`,
    cancel_url: `${process.env.APP_URL || ''}/billing`,
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    'metadata[organizationId]': String(currentTenant()),
    'metadata[plan]': plan,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok) throw new HttpError(502, data.error?.message || 'Stripe could not start checkout.');
  return res.status(200).json({ success: true, result: { provider: 'stripe', url: data.url }, message: '' });
};

/** Applies a subscription event. Unsigned events are accepted only outside production. */
const applySubscriptionEvent = async ({ organizationId, plan, status }) => {
  const update = {};
  if (PLANS[plan]) update.plan = plan;
  if (status === 'active' || status === 'trialing') {
    update.subscriptionStatus = status;
    update.graceUntil = undefined;
  } else if (status === 'past_due' || status === 'canceled' || status === 'unpaid') {
    update.subscriptionStatus = status === 'unpaid' ? 'past_due' : status;
    update.graceUntil = new Date(Date.now() + 7 * 864e5);
  }
  if (Object.keys(update).length) {
    await mongoose.model('Organization').updateOne({ _id: organizationId }, { $set: update });
  }
};

module.exports = {
  PLANS,
  assertInvoiceAllowed,
  assertSeatAllowed,
  subscriptionGate,
  summary,
  checkout,
  applySubscriptionEvent,
};
