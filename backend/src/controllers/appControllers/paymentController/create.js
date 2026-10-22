const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');

const HttpError = require('@/handlers/httpError');
const schema = require('./schemaValidate');
const { applyPaymentDelta } = require('./invoiceBalance');

const create = async (req, res) => {
  const { error, value: body } = schema.create.validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  let payment;
  const session = await mongoose.startSession();
  try {
    // The payment and the invoice balance are saved together or not at all
    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({ _id: body.invoice, removed: false })
        .session(session)
        .setOptions({ autopopulate: false })
        .exec();
      if (!invoice) throw new HttpError(404, 'Invoice not found');

      [payment] = await Model.create(
        [
          {
            ...body,
            client: invoice.client,
            currency: invoice.currency,
            createdBy: req.admin._id,
          },
        ],
        { session }
      );

      await applyPaymentDelta({
        invoiceId: invoice._id,
        delta: body.amount,
        session,
        push: payment._id,
      });
    });
  } finally {
    await session.endSession();
  }

  const result = await Model.findById(payment._id).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Payment Invoice created successfully',
  });
};

module.exports = create;
