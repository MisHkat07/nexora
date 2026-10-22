const mongoose = require('mongoose');

const Model = mongoose.model('Payment');

const HttpError = require('@/handlers/httpError');
const { applyPaymentDelta } = require('./invoiceBalance');

const remove = async (req, res) => {
  let result;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      result = await Model.findOneAndUpdate(
        { _id: req.params.id, removed: false },
        { $set: { removed: true } },
        { new: true, session, autopopulate: false }
      ).exec();
      if (!result) throw new HttpError(404, 'No document found ');

      await applyPaymentDelta({
        invoiceId: result.invoice,
        delta: -result.amount,
        session,
        pull: result._id,
      });
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};
module.exports = remove;
