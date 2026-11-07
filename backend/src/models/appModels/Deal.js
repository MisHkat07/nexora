const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  title: { type: String, required: true },
  client: { type: mongoose.Schema.ObjectId, ref: 'Client' },
  lead: { type: mongoose.Schema.ObjectId, ref: 'Lead' },
  value: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  stage: { type: String, default: 'Qualified' },
  probability: { type: Number, default: 20 },
  expectedClose: Date,
  owner: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  lostReason: String,
  quote: { type: mongoose.Schema.ObjectId, ref: 'Quote' },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Deal', schema);
