const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  invoice: { type: mongoose.Schema.ObjectId, ref: 'Invoice', required: true },
  number: Number,
  amount: { type: Number, required: true },
  reason: String,
  status: { type: String, enum: ['issued', 'applied', 'refunded'], default: 'issued' },
  payment: { type: mongoose.Schema.ObjectId, ref: 'Payment' },
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('CreditNote', schema);
