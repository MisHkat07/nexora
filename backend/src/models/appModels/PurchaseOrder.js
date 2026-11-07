const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  vendor: { type: mongoose.Schema.ObjectId, ref: 'Vendor', required: true },
  number: Number,
  status: { type: String, enum: ['draft', 'sent', 'received', 'cancelled'], default: 'draft' },
  items: [{ itemName: String, quantity: Number, price: Number, total: Number }],
  total: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  notes: String,
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('PurchaseOrder', schema);
