const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  name: { type: String, required: true },
  email: String,
  phone: String,
  source: String,
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'lost', 'converted'], default: 'new' },
  owner: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  notes: String,
  client: { type: mongoose.Schema.ObjectId, ref: 'Client' },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Lead', schema);
