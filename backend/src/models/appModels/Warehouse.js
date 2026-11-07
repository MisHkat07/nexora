const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  name: { type: String, required: true },
  address: String,
  created: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('Warehouse', schema);
