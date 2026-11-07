const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  sku: String,
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['product', 'service'], default: 'service' },
  unit: { type: String, default: 'unit' },
  price: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  category: String,
  quantity: { type: Number, default: 0 },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Product', schema);
