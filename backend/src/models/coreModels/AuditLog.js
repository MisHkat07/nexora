const mongoose = require('mongoose');

/*
  Who did what, in one organization. Money and profile edits keep the old and new value.
  expiresAt is set from the organization's plan when the row is written (free: 90 days,
  any paid plan: 365). MongoDB deletes the row after that. Plans land with billing (#50);
  until then every organization is on the free plan.
*/
const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: mongoose.Schema.ObjectId },
  diff: {
    type: [
      {
        _id: false,
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
    default: [],
  },
  ip: String,
  userAgent: String,
  created: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
auditLogSchema.index({ entity: 1, entityId: 1, created: -1 });

auditLogSchema.plugin(require('../../tenancy/plugin'));

module.exports = mongoose.model('AuditLog', auditLogSchema);
