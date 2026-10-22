const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  // Unique across all organizations: login finds the account (and its organization) by email
  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  // Set for users who joined through a team invite
  invitedBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  invitedAt: Date,
  photo: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  // What this user may do in their organization (see src/auth/permissions.js)
  role: {
    type: String,
    default: 'owner',
    enum: require('../../auth/permissions').ROLES,
  },
});

// Belongs to one organization; every query is scoped to it
adminSchema.plugin(require('../../tenancy/plugin'));

module.exports = mongoose.model('Admin', adminSchema);
