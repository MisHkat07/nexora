const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { withTenant } = require('@/tenancy/context');
const { recordOnlinePayment, checkoutForInvoice, amountDue } = require('./payments');
const convertQuoteToInvoice = require('@/controllers/appControllers/quoteController/convertQuoteToInvoice');

const signPortalToken = ({ organizationId, entity, id }) =>
  jwt.sign(
    { aud: 'portal', organizationId: String(organizationId), entity, id: String(id) },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

const readPortalToken = (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: 'portal' });
    if (!payload.organizationId || !payload.entity || !payload.id) return null;
    return payload;
  } catch {
    return null;
  }
};

const loadDocument = async (payload) => {
  const name = payload.entity === 'quote' ? 'Quote' : payload.entity === 'invoice' ? 'Invoice' : null;
  if (!name) throw new HttpError(404, 'This link is not valid.');
  const doc = await mongoose.model(name).findOne({ _id: payload.id, removed: false }).exec();
  if (!doc) throw new HttpError(404, 'This document is no longer available.');
  return doc;
};

const view = async (req, res) => {
  const payload = readPortalToken(req.params.token);
  if (!payload) throw new HttpError(403, 'This link is invalid or has expired.');
  const doc = await withTenant(payload.organizationId, async () => {
    const record = await loadDocument(payload);
    if (!record.firstViewedAt) record.firstViewedAt = new Date();
    record.viewCount = (record.viewCount || 0) + 1;
    if (record.mailStatus === 'sent') record.mailStatus = 'opened';
    await record.save();
    return record;
  });
  const client = doc.client || {};
  return res.status(200).json({
    success: true,
    result: {
      entity: payload.entity,
      id: doc._id,
      number: doc.number,
      year: doc.year,
      status: doc.status,
      date: doc.date,
      expiredDate: doc.expiredDate,
      total: doc.total,
      credit: doc.credit || 0,
      discount: doc.discount || 0,
      amountDue: payload.entity === 'invoice' ? amountDue(doc) : doc.total,
      currency: doc.currency,
      items: doc.items,
      clientName: client.name,
      notes: doc.notes,
    },
    message: '',
  });
};

const accept = async (req, res) => {
  const payload = readPortalToken(req.params.token);
  if (!payload || payload.entity !== 'quote') throw new HttpError(403, 'This link is invalid or has expired.');
  const name = String(req.body?.name || '').trim();
  if (name.length < 2) throw new HttpError(400, 'Type your name to accept the quote.');
  const result = await withTenant(payload.organizationId, async () => {
    const quote = await loadDocument(payload);
    quote.status = 'accepted';
    quote.approved = true;
    quote.acceptedByName = name;
    quote.acceptedAt = new Date();
    quote.acceptedIp = req.ip;
    await quote.save();
    let invoiceId = null;
    if (req.body?.convert !== false) {
      const captured = {};
      const fakeRes = {
        status() {
          return this;
        },
        json(body) {
          captured.body = body;
          return body;
        },
      };
      await convertQuoteToInvoice(
        { params: { id: quote._id }, admin: { _id: quote.createdBy } },
        fakeRes
      );
      invoiceId = captured.body?.result?._id || null;
    }
    return invoiceId;
  });
  return res.status(200).json({
    success: true,
    result: { status: 'accepted', invoiceId: result },
    message: 'Quote accepted.',
  });
};

const decline = async (req, res) => {
  const payload = readPortalToken(req.params.token);
  if (!payload || payload.entity !== 'quote') throw new HttpError(403, 'This link is invalid or has expired.');
  await withTenant(payload.organizationId, async () => {
    const quote = await loadDocument(payload);
    quote.status = 'declined';
    quote.declineComment = String(req.body?.comment || '').slice(0, 2000);
    await quote.save();
  });
  return res.status(200).json({ success: true, result: { status: 'declined' }, message: 'Quote declined.' });
};

const pay = async (req, res) => {
  const payload = readPortalToken(req.params.token);
  if (!payload || payload.entity !== 'invoice') throw new HttpError(403, 'This link is invalid or has expired.');
  const invoice = await withTenant(payload.organizationId, () => loadDocument(payload));
  if (req.body?.confirm === true || !process.env.STRIPE_SECRET_KEY) {
    const eventId = req.body?.eventId || `portal_${invoice._id}_${Date.now()}`;
    const recorded = await recordOnlinePayment({
      eventId,
      provider: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'test',
      organizationId: payload.organizationId,
      invoiceId: invoice._id,
      amount: amountDue(invoice),
    });
    return res.status(200).json({ success: true, result: recorded, message: 'Payment recorded.' });
  }
  const session = await checkoutForInvoice({
    invoice,
    organizationId: payload.organizationId,
    successUrl: `${process.env.APP_URL || ''}/p/${req.params.token}?paid=1`,
    cancelUrl: `${process.env.APP_URL || ''}/p/${req.params.token}`,
  });
  return res.status(200).json({ success: true, result: session, message: '' });
};

module.exports = { signPortalToken, readPortalToken, view, accept, decline, pay };
