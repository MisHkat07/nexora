const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  type: { type: String, enum: ['note', 'call', 'email', 'meeting', 'task'], default: 'note' },
  summary: { type: String, required: true },
  dueAt: Date,
  done: { type: Boolean, default: false },
  client: { type: mongoose.Schema.ObjectId, ref: 'Client' },
  deal: { type: mongoose.Schema.ObjectId, ref: 'Deal' },
  lead: { type: mongoose.Schema.ObjectId, ref: 'Lead' },
  owner: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Activity', schema);
