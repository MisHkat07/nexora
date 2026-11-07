const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  vendor: { type: mongoose.Schema.ObjectId, ref: 'Vendor' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  date: { type: Date, default: Date.now },
  category: String,
  notes: String,
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Expense', schema);
