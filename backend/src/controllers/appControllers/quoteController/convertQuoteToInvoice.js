const mongoose = require('mongoose');
const dayjs = require('dayjs');

const HttpError = require('@/handlers/httpError');
const { calculate } = require('@/helpers');

const Quote = mongoose.model('Quote');
const Invoice = mongoose.model('Invoice');
const Setting = mongoose.model('Setting');

// Days the client has to pay the new invoice
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** Takes the next invoice number atomically, so two conversions never share a number. */
const nextInvoiceNumber = async (session) => {
  const setting = await Setting.findOneAndUpdate(
    { settingKey: 'last_invoice_number' },
    { $inc: { settingValue: 1 } },
    { new: true, session }
  ).exec();
  if (setting) return setting.settingValue;

  // Installs without the setting: continue after the highest existing number
  const last = await Invoice.findOne({}, { number: 1 })
    .sort({ number: -1 })
    .session(session)
    .setOptions({ autopopulate: false })
    .exec();
  return (last?.number || 0) + 1;
};

const findInvoiceFor = (quoteId, session) =>
  Invoice.findOne({ 'converted.quote': quoteId, removed: false }).session(session).exec();

/**
 * POST /quote/convert/:id
 * Creates an invoice from the quote (once). Converting again returns the existing invoice.
 */
const convertQuoteToInvoice = async (req, res) => {
  let invoice;
  let alreadyConverted = false;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      invoice = undefined;
      alreadyConverted = false;

      const quote = await Quote.findOne({ _id: req.params.id, removed: false })
        .session(session)
        .setOptions({ autopopulate: false })
        .exec();
      if (!quote) throw new HttpError(404, 'Quote not found');

      if (quote.converted) {
        invoice = await findInvoiceFor(quote._id, session);
        if (invoice) {
          alreadyConverted = true;
          return;
        }
        // Flag set but the invoice was deleted: allow converting again
      }

      if (['declined', 'cancelled'].includes(quote.status)) {
        throw new HttpError(400, `A ${quote.status} quote can't be converted to an invoice`);
      }
      if (!quote.items?.length) throw new HttpError(400, 'The quote has no items');

      const today = dayjs().startOf('day');
      const total = quote.total;
      const discount = quote.discount || 0;

      [invoice] = await Invoice.create(
        [
          {
            createdBy: req.admin._id,
            client: quote.client,
            number: await nextInvoiceNumber(session),
            year: today.year(),
            date: today.toDate(),
            expiredDate: today.add(DEFAULT_PAYMENT_TERMS_DAYS, 'day').toDate(),
            items: quote.items.map(({ itemName, description, quantity, price, total }) => ({
              itemName,
              description,
              quantity,
              price,
              total,
            })),
            taxRate: quote.taxRate,
            subTotal: quote.subTotal,
            taxTotal: quote.taxTotal,
            total,
            discount,
            currency: quote.currency,
            notes: quote.notes,
            status: 'draft',
            paymentStatus: calculate.sub(total, discount) <= 0 ? 'paid' : 'unpaid',
            converted: { from: 'quote', quote: quote._id },
          },
        ],
        { session }
      );
      invoice.pdf = `invoice-${invoice._id}.pdf`;
      await invoice.save({ session });

      // Converted quotes count as accepted
      await Quote.updateOne(
        { _id: quote._id },
        { $set: { converted: true, status: 'accepted', updated: new Date() } },
        { session }
      ).exec();
    });
  } finally {
    await session.endSession();
  }

  const result = await Invoice.findById(invoice._id).exec();
  return res.status(200).json({
    success: true,
    result,
    message: alreadyConverted
      ? 'This quote was already converted; showing its invoice'
      : 'Quote converted to invoice successfully',
  });
};

module.exports = convertQuoteToInvoice;
