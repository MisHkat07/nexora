const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  product: { type: mongoose.Schema.ObjectId, ref: 'Product', required: true },
  warehouse: String,
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out', 'adjust'], default: 'adjust' },
  note: String,
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('StockMovement', schema);
