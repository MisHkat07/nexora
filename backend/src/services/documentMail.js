const Joi = require('joi');
const dayjs = require('dayjs');
const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { loadSettings } = require('@/middlewares/settings');
const { useMoney } = require('@/settings');
const { generatePdf } = require('@/controllers/pdfController');
const { signDownloadUrl } = require('@/utils/downloadToken');
const { documentEmail } = require('@/emailTemplate');
const { sendEmail, appLink } = require('./email');

// Links in emails stay valid for a week
const EMAIL_LINK_TTL = '7d';

const PLACEHOLDER_EMAILS = ['youremail@example.com'];

const schema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  // Defaults to the customer's email
  to: Joi.string().email({ tlds: false }).max(254),
  cc: Joi.alternatives()
    .try(Joi.array().items(Joi.string().email({ tlds: false })).max(5), Joi.string().email({ tlds: false }))
    .default([]),
  // Optional personal message shown instead of the default introduction
  message: Joi.string().allow('').max(5000),
});

const documentNumber = (doc, prefix) => `${prefix || ''}${doc.number}/${doc.year || dayjs(doc.date).year()}`;

const DOCUMENTS = {
  invoice: {
    modelName: 'Invoice',
    title: 'Invoice',
    prefixKey: 'invoice_prefix',
    intro: (company) => `Please find your invoice from ${company} attached.`,
    details: (doc, reference, money, date) => [
      ['Invoice', reference],
      ['Issue date', date(doc.date)],
      ['Due date', date(doc.expiredDate)],
      ['Total', money(doc.total)],
      ...(doc.credit > 0 ? [['Paid', money(doc.credit)]] : []),
      ['Amount due', money(Math.max(doc.total - (doc.discount || 0) - (doc.credit || 0), 0))],
    ],
    markSent: true,
  },
  quote: {
    modelName: 'Quote',
    title: 'Quote',
    prefixKey: 'quote_prefix',
    intro: (company) => `Please find your quote from ${company} attached.`,
    details: (doc, reference, money, date) => [
      ['Quote', reference],
      ['Date', date(doc.date)],
      ['Valid until', date(doc.expiredDate)],
      ['Total', money(doc.total)],
    ],
    markSent: true,
  },
  payment: {
    modelName: 'Payment',
    title: 'Payment receipt',
    prefixKey: 'payment_prefix',
    intro: (company) => `Thank you for your payment. Your receipt from ${company} is attached.`,
    details: (doc, reference, money, date) => [
      ['Receipt', reference],
      ['Payment date', date(doc.date)],
      ['Amount paid', money(doc.amount)],
      ...(doc.invoice?.number ? [['For invoice', `${doc.invoice.number}/${doc.invoice.year}`]] : []),
    ],
    markSent: false,
  },
};

/**
 * Emails an invoice, quote or payment receipt to the customer with the PDF attached and a
 * 7-day download link. Records the send on the document; invoices and quotes in draft or
 * pending become "sent".
 */
const sendDocumentEmail = async ({ entity, body, user, senderVerified }) => {
  const doc = DOCUMENTS[entity];
  if (!doc) throw new HttpError(404, 'Unknown document type');
  // New signups can't email customers until they confirm their own address (anti-spam)
  if (!senderVerified) {
    throw new HttpError(403, 'Confirm your email address before sending emails to customers.');
  }

  const { error, value } = schema.validate(body);
  if (error) throw new HttpError(400, error.details[0].message);
  const cc = [].concat(value.cc || []);

  const Model = mongoose.model(doc.modelName);
  const record = await Model.findOne({ _id: value.id, removed: false }).exec();
  if (!record) throw new HttpError(404, `${doc.title} not found`);

  const client = record.client || {};
  const to = value.to || client.email;
  if (!to) {
    throw new HttpError(400, 'This customer has no email address. Add one to the customer, or enter a recipient.');
  }

  const settings = await loadSettings();
  const companyName = settings.company_name || 'Nexora';
  const replyTo =
    settings.company_email && !PLACEHOLDER_EMAILS.includes(settings.company_email)
      ? settings.company_email
      : undefined;
  const { moneyFormatter } = useMoney({ settings });
  const money = (amount) => moneyFormatter({ amount });
  const date = (value) => (value ? dayjs(value).format(settings.idurar_app_date_format || 'DD/MM/YYYY') : '');

  const reference = documentNumber(record, settings[doc.prefixKey]);
  const title = `${doc.title} ${reference}`;

  const pdf = await generatePdf(doc.modelName, record);
  const content = documentEmail({
    companyName,
    clientName: client.name || 'there',
    title: doc.title,
    intro: doc.intro(companyName),
    details: doc.details(record, reference, money, date),
    message: value.message,
    downloadUrl: appLink(signDownloadUrl(entity, record._id, EMAIL_LINK_TTL)),
  });

  const { id: messageId } = await sendEmail({
    to,
    cc,
    replyTo,
    subject: `${title} from ${companyName}`,
    html: content.html,
    text: content.text,
    attachments: [{ filename: `${entity}-${reference.replace(/[^\w.-]+/g, '-')}.pdf`, content: pdf }],
  });

  const update = {
    $push: { emails: { to, cc, sentAt: new Date(), sentBy: user._id, messageId } },
  };
  if (doc.markSent && ['draft', 'pending'].includes(record.status)) update.$set = { status: 'sent' };
  await Model.updateOne({ _id: record._id }, update).exec();

  return { to, cc, messageId };
};

module.exports = { sendDocumentEmail };
