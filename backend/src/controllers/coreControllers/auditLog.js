const Joi = require('joi');
const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');
const { can } = require('@/auth/permissions');

const querySchema = Joi.object({
  entity: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z]{2,32}$/),
  entityId: Joi.string().hex().length(24),
  action: Joi.string().trim().max(40),
  page: Joi.number().integer().min(1).default(1),
  items: Joi.number().integer().min(1).max(50).default(20),
});

/**
 * GET /api/audit
 * The full log is for owners and admins. A single record's history is for anyone who can read that record.
 */
exports.list = async (req, res) => {
  const { error, value } = querySchema.validate(req.query);
  if (error) throw new HttpError(400, error.details[0].message);

  const isAdmin = can(req.admin.role, 'audit:read') || ['owner', 'admin'].includes(req.admin.role);
  const historyOfOne = Boolean(value.entity && value.entityId);
  if (!historyOfOne && !isAdmin) {
    throw new HttpError(403, "You don't have permission to view the audit log.");
  }
  if (historyOfOne && !isAdmin && !can(req.admin.role, `${value.entity}:read`)) {
    throw new HttpError(403, "You don't have permission to view this history.");
  }

  const filter = {};
  if (value.entity) filter.entity = value.entity;
  if (value.entityId) filter.entityId = value.entityId;
  if (value.action) filter.action = value.action;

  const Model = mongoose.model('AuditLog');
  const skip = (value.page - 1) * value.items;
  const [rows, count] = await Promise.all([
    Model.find(filter)
      .sort({ created: -1 })
      .skip(skip)
      .limit(value.items)
      .populate('user', 'name surname email')
      .lean(),
    Model.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    result: rows.map((row) => ({
      id: row._id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      diff: row.diff || [],
      ip: row.ip,
      created: row.created,
      user: row.user
        ? { id: row.user._id, name: [row.user.name, row.user.surname].filter(Boolean).join(' '), email: row.user.email }
        : null,
    })),
    pagination: { page: value.page, count, pages: Math.ceil(count / value.items) || 1 },
    message: '',
  });
};
