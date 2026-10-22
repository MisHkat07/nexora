const mongoose = require('mongoose');

const { calculate } = require('@/helpers');
const HttpError = require('@/handlers/httpError');

// Tolerates floating point drift when comparing money stored as numbers
const EPSILON = 0.001;

const amountDue = (invoice) => calculate.sub(invoice.total, invoice.discount);

const paymentStatusFor = (invoice) => {
  const remaining = calculate.sub(amountDue(invoice), invoice.credit);
  if (remaining <= 0) return 'paid';
  return invoice.credit > 0 ? 'partially' : 'unpaid';
};

/**
 * Atomically adds `delta` (may be negative) to the invoice's paid credit, refusing to
 * overpay or go below zero, then recomputes its payment status. Must run inside a transaction.
 */
const applyPaymentDelta = async ({ invoiceId, delta, session, push, pull }) => {
  const Invoice = mongoose.model('Invoice');

  const update = { $inc: { credit: delta } };
  if (push) update.$push = { payment: push };
  if (pull) update.$pull = { payment: pull };

  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: invoiceId,
      removed: false,
      $expr: {
        $and: [
          {
            $lte: [
              { $add: ['$credit', delta] },
              { $add: [{ $subtract: ['$total', '$discount'] }, EPSILON] },
            ],
          },
          { $gte: [{ $add: ['$credit', delta] }, -EPSILON] },
        ],
      },
    },
    update,
    { new: true, session, autopopulate: false }
  ).exec();

  if (!invoice) {
    const current = await Invoice.findOne({ _id: invoiceId, removed: false })
      .session(session)
      .setOptions({ autopopulate: false })
      .exec();
    if (!current) throw new HttpError(404, 'Invoice not found');
    const remaining = calculate.sub(amountDue(current), current.credit);
    throw new HttpError(400, `The Max Amount you can add is ${remaining}`);
  }

  invoice.paymentStatus = paymentStatusFor(invoice);
  await Invoice.updateOne(
    { _id: invoice._id },
    { $set: { paymentStatus: invoice.paymentStatus } },
    { session }
  ).exec();
  return invoice;
};

module.exports = { applyPaymentDelta, paymentStatusFor };
