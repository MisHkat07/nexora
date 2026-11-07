const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { withoutTenant, withTenant } = require('@/tenancy/context');
const { enqueue } = require('@/jobs/queue');

const INTERVALS = { weekly: 7, monthly: 30, quarterly: 91, yearly: 365 };

const periodKey = (date, frequency) => {
  const d = new Date(date);
  if (frequency === 'weekly') {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 864e5 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  if (frequency === 'yearly') return String(d.getFullYear());
  if (frequency === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const advance = (date, frequency) => new Date(date.getTime() + (INTERVALS[frequency] || 30) * 864e5);

/** Creates at most one invoice per profile per period, then schedules the next run. */
const runRecurring = async () => {
  const profiles = await withoutTenant(() =>
    mongoose.model('RecurringProfile').find({ status: 'active', nextRunAt: { $lte: new Date() } }).exec()
  );
  for (const profile of profiles) {
    await withTenant(profile.organizationId, async () => {
      const Invoice = mongoose.model('Invoice');
      const source = await Invoice.findOne({ _id: profile.sourceInvoice, removed: false }).setOptions({ autopopulate: false }).exec();
      if (!source) {
        profile.status = 'paused';
        await profile.save();
        return;
      }
      const period = periodKey(profile.nextRunAt, profile.frequency);
      const already = await Invoice.findOne({ recurringProfile: profile._id, recurringPeriod: period }).exec();
      if (!already) {
        const { increaseBySettingKey } = require('@/middlewares/settings');
        const numbered = await increaseBySettingKey({ settingKey: 'last_invoice_number' });
        const created = await Invoice.create({
          createdBy: source.createdBy,
          number: numbered?.settingValue || source.number,
          year: new Date().getFullYear(),
          date: new Date(),
          expiredDate: advance(new Date(), 'weekly'),
          client: source.client,
          items: source.items,
          taxRate: source.taxRate,
          subTotal: source.subTotal,
          taxTotal: source.taxTotal,
          total: source.total,
          currency: source.currency,
          discount: source.discount || 0,
          notes: source.notes,
          status: 'draft',
          recurringProfile: profile._id,
          recurringPeriod: period,
        });
        profile.generated = (profile.generated || 0) + 1;
        if (profile.autoSend) {
          await enqueue('send-document-email', {
            organizationId: String(profile.organizationId),
            entity: 'invoice',
            body: { id: String(created._id) },
            userId: String(source.createdBy),
            senderVerified: true,
          });
        }
      }
      profile.nextRunAt = advance(profile.nextRunAt, profile.frequency);
      if (profile.endAt && profile.nextRunAt > profile.endAt) profile.status = 'ended';
      if (profile.occurrences && profile.generated >= profile.occurrences) profile.status = 'ended';
      await profile.save();
    });
  }
};

const createProfile = async (req, res) => {
  const { invoiceId, frequency = 'monthly', autoSend = false, occurrences, endAt } = req.body || {};
  if (!INTERVALS[frequency]) throw new HttpError(400, 'Frequency must be weekly, monthly, quarterly or yearly.');
  const invoice = await mongoose.model('Invoice').findOne({ _id: invoiceId, removed: false }).exec();
  if (!invoice) throw new HttpError(404, 'Invoice not found');
  const profile = await mongoose.model('RecurringProfile').create({
    sourceInvoice: invoice._id,
    frequency,
    autoSend: Boolean(autoSend),
    occurrences: occurrences || undefined,
    endAt: endAt ? new Date(endAt) : undefined,
    nextRunAt: advance(new Date(), frequency),
    status: 'active',
  });
  return res.status(201).json({ success: true, result: profile, message: 'Recurring invoice scheduled.' });
};

const listProfiles = async (req, res) => {
  const rows = await mongoose.model('RecurringProfile').find({}).sort({ created: -1 }).lean();
  return res.status(200).json({ success: true, result: rows, message: '' });
};

const updateProfile = async (req, res) => {
  const status = req.body?.status;
  if (!['active', 'paused'].includes(status)) throw new HttpError(400, 'Status must be active or paused.');
  const profile = await mongoose.model('RecurringProfile').findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!profile) throw new HttpError(404, 'Recurring profile not found');
  return res.status(200).json({ success: true, result: profile, message: 'Updated' });
};

module.exports = { runRecurring, createProfile, listProfiles, updateProfile, periodKey };
