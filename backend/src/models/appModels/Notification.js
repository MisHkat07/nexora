const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  user: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  title: { type: String, required: true },
  body: String,
  read: { type: Boolean, default: false },
  link: String,
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Notification', schema);
