const express = require('express');

const { catchErrors } = require('@/handlers/errorHandlers');
const authorize = require('@/auth/authorize');
const HttpError = require('@/handlers/httpError');
const { verifyStripeSignature, recordOnlinePayment } = require('./payments');
const portal = require('./portal');
const recurring = require('./recurring');
const billing = require('./billing');
const platform = require('./platform');

const publicRouter = express.Router();
const privateRouter = express.Router();

publicRouter.get('/portal/:token', catchErrors(portal.view));
publicRouter.post('/portal/:token/accept', catchErrors(portal.accept));
publicRouter.post('/portal/:token/decline', catchErrors(portal.decline));
publicRouter.post('/portal/:token/pay', catchErrors(portal.pay));

publicRouter.post('/webhooks/stripe', catchErrors(async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], secret)) {
      throw new HttpError(400, 'Invalid Stripe signature.');
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new HttpError(503, 'Stripe webhooks are not configured.');
  }
  const event = req.body || {};
  if (event.type === 'checkout.session.completed' && event.data?.object?.metadata?.invoiceId) {
    const object = event.data.object;
    await recordOnlinePayment({
      eventId: event.id,
      provider: 'stripe',
      organizationId: object.metadata.organizationId,
      invoiceId: object.metadata.invoiceId,
      amount: (object.amount_total || 0) / 100,
    });
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const object = event.data?.object || {};
    await billing.applySubscriptionEvent({
      organizationId: object.metadata?.organizationId,
      plan: object.metadata?.plan,
      status: event.type.endsWith('deleted') ? 'canceled' : object.status,
    });
  }
  return res.status(200).json({ received: true });
}));

const ownerOrAdmin = (req, res, next) => authorize('setting:update')(req, res, next);

privateRouter.get('/billing', catchErrors(billing.summary));
privateRouter.post('/billing/checkout', ownerOrAdmin, catchErrors(billing.checkout));

privateRouter.post('/invoice/recurring', authorize('invoice:create'), catchErrors(recurring.createProfile));
privateRouter.get('/invoice/recurring', authorize('invoice:read'), catchErrors(recurring.listProfiles));
privateRouter.patch('/invoice/recurring/:id', authorize('invoice:update'), catchErrors(recurring.updateProfile));

privateRouter.get('/dashboard', authorize('invoice:read'), catchErrors(platform.dashboard));
privateRouter.get('/reports/finance', authorize('invoice:read'), catchErrors(platform.reports));
privateRouter.get('/search', catchErrors(platform.search));
privateRouter.post('/lead/:id/convert', authorize('lead:update'), catchErrors(platform.convertLead));
privateRouter.post('/creditnote/apply', authorize('creditnote:create'), catchErrors(platform.applyCredit));
privateRouter.post('/creditnote/:id/refund', authorize('creditnote:create'), catchErrors(platform.refundCredit));
privateRouter.post('/stock/move', authorize('product:update'), catchErrors(platform.moveStock));
privateRouter.post('/import/clients', authorize('client:create'), catchErrors(platform.importClients));
privateRouter.get('/export/clients', authorize('client:read'), catchErrors(platform.exportClients));
privateRouter.post('/ai/draft', authorize('invoice:create'), catchErrors(platform.aiDraft));
privateRouter.post('/ai/receipt', authorize('expense:create'), catchErrors(platform.aiReceipt));
privateRouter.post('/ai/ask', catchErrors(platform.aiAsk));
privateRouter.get('/onboarding', catchErrors(platform.onboarding));
privateRouter.post('/onboarding/sample', authorize('client:create'), catchErrors(platform.sampleData));
privateRouter.get('/compliance/export', ownerOrAdmin, catchErrors(platform.exportData));
privateRouter.post('/compliance/delete', catchErrors(platform.deleteWorkspace));
privateRouter.post('/notification/read-all', catchErrors(platform.readAllNotifications));
privateRouter.get('/currency/convert', catchErrors(platform.convertCurrency));
privateRouter.get('/views', catchErrors(platform.savedViews));
privateRouter.post('/views', catchErrors(platform.savedViews));
privateRouter.get('/pipeline/stages', (req, res) => {
  res.status(200).json({ success: true, result: platform.STAGES, message: '' });
});

module.exports = { publicRouter, privateRouter, signPortalToken: portal.signPortalToken };
