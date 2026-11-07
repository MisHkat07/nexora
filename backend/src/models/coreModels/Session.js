const mongoose = require('mongoose');

/*
  One login on one device. The browser holds a refresh token (httpOnly cookie) made of the
  session id and a secret; only the secret's hash is stored. Each refresh replaces the secret,
  so a stolen, already-used refresh token is detected (see src/auth/sessions.js).
  Not tenant-scoped: sessions are always looked up by id or by user.
*/
const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true, index: true },
  organizationId: { type: mongoose.Schema.ObjectId, ref: 'Organization' },
  secretHash: { type: String, required: true },
  // The secret before the last rotation, accepted briefly when two tabs refresh at once
  previousSecretHash: String,
  rotatedAt: Date,
  remember: { type: Boolean, default: false },
  userAgent: String,
  ip: String,
  created: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  revokedAt: Date,
  // MongoDB deletes the session after this time
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

module.exports = mongoose.model('Session', sessionSchema);
