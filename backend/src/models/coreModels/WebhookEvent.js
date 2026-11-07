const mongoose = require('mongoose');

// One row per provider event id, so a replayed webhook cannot record a second payment.
const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  organizationId: { type: mongoose.Schema.ObjectId, ref: 'Organization' },
  invoiceId: { type: mongoose.Schema.ObjectId },
  paymentId: { type: mongoose.Schema.ObjectId },
  created: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
