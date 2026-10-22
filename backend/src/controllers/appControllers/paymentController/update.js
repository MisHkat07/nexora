const mongoose = require('mongoose');

const Model = mongoose.model('Payment');

const { calculate } = require('@/helpers');
const HttpError = require('@/handlers/httpError');
const schema = require('./schemaValidate');
const { applyPaymentDelta } = require('./invoiceBalance');

const update = async (req, res) => {
  const { error, value: body } = schema.update.validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  let result;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const previousPayment = await Model.findOne({ _id: req.params.id, removed: false })
        .session(session)
        .setOptions({ autopopulate: false })
        .exec();
      if (!previousPayment) throw new HttpError(404, 'No document found ');

      const changedAmount = calculate.sub(body.amount, previousPayment.amount);
      if (changedAmount !== 0) {
        await applyPaymentDelta({
          invoiceId: previousPayment.invoice,
          delta: changedAmount,
          session,
        });
      }

      result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false },
        { $set: { ...body, updated: new Date() } },
        { new: true, session, runValidators: true }
      ).exec();
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully updated the Payment ',
  });
};

module.exports = update;
