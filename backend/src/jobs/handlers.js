const mongoose = require('mongoose');

const { registerJob } = require('./queue');
const { sendDocumentEmail } = require('@/services/documentMail');
const { runRecurring } = require('@/features/recurring');
const { runReminders } = require('@/features/reminders');
const logger = require('@/logger');

const ModelName = { invoice: 'Invoice', quote: 'Quote', payment: 'Payment' };

registerJob('send-document-email', async (payload) => {
  const Model = mongoose.model(ModelName[payload.entity]);
  const user = await mongoose.model('Admin').findById(payload.userId).exec();
  if (!user) throw new Error('Sender no longer exists');
  try {
    await sendDocumentEmail({
      entity: payload.entity,
      body: payload.body,
      user,
      senderVerified: payload.senderVerified,
    });
    if (payload.entity !== 'payment') {
      await Model.updateOne({ _id: payload.body.id }, { $set: { mailStatus: 'sent' } }).exec();
    }
  } catch (error) {
    if (payload.entity !== 'payment') {
      await Model.updateOne({ _id: payload.body.id }, { $set: { mailStatus: 'failed' } }).exec();
    }
    throw error;
  }
});

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

registerJob('recurring-invoices', async () => {
  await runRecurring();
  const { enqueue } = require('./queue');
  await enqueue('recurring-invoices', {}, { runAt: tomorrow(), maxAttempts: 3 });
});

registerJob('payment-reminders', async () => {
  await runReminders();
  const { enqueue } = require('./queue');
  await enqueue('payment-reminders', {}, { runAt: tomorrow(), maxAttempts: 3 });
});

/** Ensures the daily schedules exist. Safe to call on every boot. */
const ensureSchedules = async () => {
  const Job = mongoose.model('Job');
  for (const name of ['recurring-invoices', 'payment-reminders']) {
    const existing = await Job.findOne({ name, status: 'queued' }).exec();
    if (!existing) {
      await Job.create({ name, payload: {}, runAt: new Date(), maxAttempts: 1 });
    }
  }
  logger.info('Scheduled jobs are queued');
};

module.exports = { ensureSchedules };
