const mongoose = require('mongoose');

// A company using Nexora. Every business record belongs to exactly one organization.
const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
  },
  plan: {
    type: String,
    default: 'free',
  },
  owner: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Organization', organizationSchema);
