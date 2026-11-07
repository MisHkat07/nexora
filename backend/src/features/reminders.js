const mongoose = require('mongoose');

const { withoutTenant, withTenant } = require('@/tenancy/context');
const { enqueue } = require('@/jobs/queue');
const { amountDue } = require('./payments');

const DEFAULT_RULES = [
  { key: 'before_3', daysFromDue: -3 },
  { key: 'due', daysFromDue: 0 },
  { key: 'overdue_7', daysFromDue: 7 },
  { key: 'overdue_14', daysFromDue: 14 },
  { key: 'overdue_30', daysFromDue: 30 },
];

const dayDiff = (due, now) => Math.floor((now.setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 864e5);

/**
 * Emails each matching reminder once. Paying an invoice (nothing left due) stops further reminders.
 * Also marks past-due invoices overdue.
 */
const runReminders = async () => {
  const orgs = await withoutTenant(() => mongoose.model('Organization').find({ status: 'active' }).select('_id').lean());
  const now = new Date();
  for (const org of orgs) {
    await withTenant(org._id, async () => {
      const Invoice = mongoose.model('Invoice');
      const { loadSettings } = require('@/middlewares/settings');
      const settings = await loadSettings();
      let rules = DEFAULT_RULES;
      if (settings.reminder_rules) {
        try {
          rules = JSON.parse(settings.reminder_rules);
        } catch {
          rules = DEFAULT_RULES;
        }
      }
      const invoices = await Invoice.find({ removed: false, paymentStatus: { $in: ['unpaid', 'partially'] }, remindersOff: { $ne: true } })
        .setOptions({ autopopulate: false })
        .exec();
      for (const invoice of invoices) {
        const due = amountDue(invoice);
        if (due <= 0 || !invoice.expiredDate) continue;
        const late = dayDiff(invoice.expiredDate, new Date(now));
        if (Number.isNaN(late)) continue;
        if (late > 0 && !invoice.isOverdue) {
          invoice.isOverdue = true;
          await invoice.save();
        }
        const client = await mongoose.model('Client').findById(invoice.client).exec();
        if (client?.remindersOff) continue;
        for (const rule of rules) {
          if (late < rule.daysFromDue) continue;
          const key = `${rule.key}`;
          if ((invoice.remindersSent || []).includes(key)) continue;
          await enqueue('send-document-email', {
            organizationId: String(org._id),
            entity: 'invoice',
            body: {
              id: String(invoice._id),
              message: `This is a payment reminder (${rule.key.replace(/_/g, ' ')}). Amount due: ${due}.`,
            },
            userId: String(invoice.createdBy),
            senderVerified: true,
          });
          invoice.remindersSent = [...(invoice.remindersSent || []), key];
          await invoice.save();
        }
      }
    });
  }
};

module.exports = { runReminders, DEFAULT_RULES };
