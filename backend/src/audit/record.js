const mongoose = require('mongoose');

const logger = require('@/logger');
const { currentTenant, withTenant } = require('@/tenancy/context');

const RETENTION_DAYS = { free: 90, paid: 365 };
const MAX_VALUE_LENGTH = 500;

const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

const present = (value, depth = 0) => {
  if (value == null || depth > 4) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value._bsontype === 'ObjectId') return String(value);
  if (Array.isArray(value)) return value.map((item) => present(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === '_id' || key === '__v' || key === 'password' || key === 'salt') continue;
      out[key] = present(item, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) return `${value.slice(0, MAX_VALUE_LENGTH)}…`;
  return value;
};

const bounded = (value) => {
  const shown = present(value);
  if (shown && typeof shown === 'object' && JSON.stringify(shown).length > MAX_VALUE_LENGTH) {
    return { note: 'value omitted (too large)' };
  }
  return shown;
};

/** Fields whose value changed between two documents. */
const changedFields = (before, after, fields) => {
  const previous = plain(before) || {};
  const next = plain(after) || {};
  const changes = [];
  for (const field of fields) {
    if (JSON.stringify(previous[field]) === JSON.stringify(next[field])) continue;
    changes.push({ field, from: bounded(previous[field]), to: bounded(next[field]) });
  }
  return changes;
};

const expiresAtFor = async (organizationId) => {
  const org = await mongoose.model('Organization').findById(organizationId).select('plan').lean();
  const days = org?.plan && org.plan !== 'free' ? RETENTION_DAYS.paid : RETENTION_DAYS.free;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

/**
 * Writes one audit row. Never throws: a failed audit must not fail the user's action.
 * Pass organizationId for events that happen before the request has a tenant (login).
 */
const record = async ({ req, action, entity, entityId, diff = [], organizationId, userId }) => {
  const orgId = organizationId || req?.admin?.organizationId;
  if (!orgId || !action || !entity) return;
  try {
    const expiresAt = await expiresAtFor(orgId);
    const write = () =>
      mongoose.model('AuditLog').create({
        user: userId || req?.admin?._id,
        action,
        entity,
        entityId: entityId || undefined,
        diff,
        ip: req?.ip,
        userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 300),
        expiresAt,
      });
    if (String(currentTenant() || '') === String(orgId)) await write();
    else await withTenant(orgId, write);
  } catch (error) {
    logger.error({ err: error, action, entity }, 'Audit log could not be written');
  }
};

/** Records an update when at least one of `fields` changed. */
const recordDocumentChange = async ({ req, action = 'update', entity, entityId, before, after, fields }) => {
  const diff = changedFields(before, after, fields);
  if (action === 'update' && diff.length === 0) return;
  await record({
    req,
    action,
    entity,
    entityId: entityId || after?._id || before?._id,
    diff,
  });
};

module.exports = { record, recordDocumentChange, changedFields };
