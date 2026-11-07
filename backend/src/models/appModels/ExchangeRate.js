const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  removed: { type: Boolean, default: false },
  code: { type: String, required: true, uppercase: true },
  rate: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});
schema.plugin(require('../../tenancy/plugin'));
module.exports = mongoose.model('ExchangeRate', schema);
