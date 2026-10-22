const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  settingCategory: {
    type: String,
    required: true,
    lowercase: true,
  },
  settingKey: {
    type: String,
    lowercase: true,
    required: true,
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  valueType: {
    type: String,
    default: 'String',
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  isCoreSetting: {
    type: Boolean,
    default: false,
  },
});

// Belongs to one organization; every query is scoped to it
settingSchema.plugin(require('../../tenancy/plugin'));

module.exports = mongoose.model('Setting', settingSchema);
