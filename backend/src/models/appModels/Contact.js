const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  name: { type: String, required: true },
  title: String,
  email: String,
  phone: String,
  client: { type: mongoose.Schema.ObjectId, ref: 'Client', required: true },
  isPrimary: { type: Boolean, default: false },
  notes: String,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Contact', schema);
