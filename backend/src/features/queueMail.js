const mongoose = require('mongoose');

const { sendDocumentEmail } = require('@/services/documentMail');
const { enqueue } = require('@/jobs/queue');
const { currentTenant } = require('@/tenancy/context');

const MODEL = { invoice: 'Invoice', quote: 'Quote', payment: 'Payment' };

/** Tests send mail immediately. Everywhere else the worker sends it. */
const queueOrSend = (entity) => async (req, res) => {
  if (process.env.NODE_ENV === 'test') {
    const result = await sendDocumentEmail({
      entity,
      body: req.body,
      user: req.admin,
      senderVerified: req.emailVerified,
    });
    return res.status(200).json({
      success: true,
      result,
      message: `Email sent to ${result.to}`,
    });
  }

  await enqueue('send-document-email', {
    organizationId: String(currentTenant()),
    entity,
    body: req.body,
    userId: String(req.admin._id),
    senderVerified: Boolean(req.emailVerified),
  });
  if (entity !== 'payment' && req.body?.id) {
    await mongoose.model(MODEL[entity]).updateOne({ _id: req.body.id }, { $set: { mailStatus: 'queued' } }).exec();
  }
  return res.status(202).json({
    success: true,
    result: { mailStatus: 'queued' },
    message: 'Email queued',
  });
};

module.exports = { queueOrSend };
