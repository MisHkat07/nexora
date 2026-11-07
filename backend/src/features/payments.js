const crypto = require('crypto');
const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { withTenant } = require('@/tenancy/context');
const { applyPaymentDelta } = require('@/controllers/appControllers/paymentController/invoiceBalance');
const { increaseBySettingKey } = require('@/middlewares/settings');

const amountDue = (invoice) => Math.max((invoice.total || 0) - (invoice.discount || 0) - (invoice.credit || 0), 0);

/**
 * Records a card payment once per provider event. Replaying the same event id is a no-op.
 * Runs in the invoice's organization.
 */
const recordOnlinePayment = async ({ eventId, provider, organizationId, invoiceId, amount }) => {
  const WebhookEvent = mongoose.model('WebhookEvent');
  let claimed;
  try {
    claimed = await WebhookEvent.create({ eventId, provider, organizationId, invoiceId });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await WebhookEvent.findOne({ eventId }).lean();
    return { duplicate: true, paymentId: existing?.paymentId };
  }

  try {
    const paymentId = await withTenant(organizationId, async () => {
    const Invoice = mongoose.model('Invoice');
    const Payment = mongoose.model('Payment');
    const PaymentMode = mongoose.model('PaymentMode');
    let mode = await PaymentMode.findOne({ name: 'Card (Stripe)', removed: false }).exec();
    if (!mode) {
      mode = await PaymentMode.create({ name: 'Card (Stripe)', description: 'Online card payment', isDefault: false });
    }
    const numbered = await increaseBySettingKey({ settingKey: 'last_payment_number' });
    const number = numbered?.settingValue || 1;

    let payment;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const invoice = await Invoice.findOne({ _id: invoiceId, removed: false })
          .session(session)
          .setOptions({ autopopulate: false })
          .exec();
        if (!invoice) throw new HttpError(404, 'Invoice not found');
        const due = amountDue(invoice);
        const pay = Math.min(Number(amount) || due, due);
        if (pay <= 0) throw new HttpError(400, 'This invoice has nothing left to pay.');
        [payment] = await Payment.create(
          [
            {
              number,
              invoice: invoice._id,
              client: invoice.client,
              amount: pay,
              currency: invoice.currency || 'NA',
              date: new Date(),
              createdBy: invoice.createdBy,
              paymentMode: mode._id,
              ref: eventId,
              description: `Online payment via ${provider}`,
            },
          ],
          { session }
        );
        await applyPaymentDelta({ invoiceId: invoice._id, delta: pay, session, push: payment._id });
      });
    } finally {
      await session.endSession();
    }

    await mongoose.model('Notification').create({
      user: payment.createdBy,
      title: 'Invoice paid online',
      body: `A ${provider} payment was recorded.`,
      link: `/invoice/read/${invoiceId}`,
    }).catch(() => {});
    return payment._id;
    });
    await WebhookEvent.updateOne({ _id: claimed._id }, { paymentId });
    return { duplicate: false, paymentId };
  } catch (error) {
    await WebhookEvent.deleteOne({ _id: claimed._id });
    throw error;
  }
};

/** Verifies a Stripe webhook signature (t=timestamp,v1=hmac). */
const verifyStripeSignature = (rawBody, header, secret) => {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(',').map((piece) => piece.split('=')));
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const checkoutForInvoice = async ({ invoice, organizationId, successUrl, cancelUrl }) => {
  const due = amountDue(invoice);
  if (due <= 0) throw new HttpError(400, 'This invoice is already paid.');
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return {
      provider: 'test',
      url: null,
      sessionId: `test_${invoice._id}`,
      amount: due,
      message: 'Card payments are not configured. Use the test pay action.',
    };
  }
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'line_items[0][price_data][currency]': (invoice.currency && invoice.currency !== 'NA' ? invoice.currency : 'usd').toLowerCase(),
    'line_items[0][price_data][product_data][name]': `Invoice ${invoice.number}`,
    'line_items[0][price_data][unit_amount]': String(Math.round(due * 100)),
    'line_items[0][quantity]': '1',
    'metadata[invoiceId]': String(invoice._id),
    'metadata[organizationId]': String(organizationId),
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok) throw new HttpError(502, data.error?.message || 'Stripe could not start the payment.');
  return { provider: 'stripe', url: data.url, sessionId: data.id, amount: due };
};

module.exports = { recordOnlinePayment, verifyStripeSignature, checkoutForInvoice, amountDue };
