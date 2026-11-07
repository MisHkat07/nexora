const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  sourceInvoice: { type: mongoose.Schema.ObjectId, ref: 'Invoice', required: true },
  frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], required: true },
  nextRunAt: { type: Date, required: true },
  endAt: Date,
  occurrences: Number,
  generated: { type: Number, default: 0 },
  autoSend: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('RecurringProfile', schema);
