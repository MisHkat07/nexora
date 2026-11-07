const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');

const view = (org) => ({
  id: org._id,
  name: org.name,
  plan: org.plan || 'free',
  requireTwoFactor: Boolean(org.requireTwoFactor),
});

/** GET /api/organization — the signed-in user's company. */
exports.read = async (req, res) => {
  const org = await mongoose.model('Organization').findById(req.admin.organizationId).lean();
  if (!org) throw new HttpError(404, 'Organization not found');
  return res.status(200).json({ success: true, result: view(org), message: '' });
};

/** PATCH /api/organization { requireTwoFactor } — owners and admins. */
exports.update = async (req, res) => {
  if (typeof req.body?.requireTwoFactor !== 'boolean') {
    throw new HttpError(400, 'requireTwoFactor must be true or false.');
  }
  const org = await mongoose
    .model('Organization')
    .findOneAndUpdate(
      { _id: req.admin.organizationId },
      { $set: { requireTwoFactor: req.body.requireTwoFactor } },
      { new: true }
    )
    .lean();
  if (!org) throw new HttpError(404, 'Organization not found');
  return res.status(200).json({
    success: true,
    result: view(org),
    message: org.requireTwoFactor
      ? 'Everyone in this organization must use two-factor authentication.'
      : 'Two-factor authentication is optional.',
  });
};
