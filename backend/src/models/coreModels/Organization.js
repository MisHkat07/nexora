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
    enum: ['free', 'starter', 'pro'],
    default: 'free',
  },
  // trialing and active can write; past_due becomes read-only after graceUntil
  subscriptionStatus: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled'] },
  trialEndsAt: Date,
  graceUntil: Date,
  // When on, members who have not enrolled in 2FA can only set it up and sign out
  requireTwoFactor: {
    type: Boolean,
    default: false,
  },
  owner: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Organization', organizationSchema);
