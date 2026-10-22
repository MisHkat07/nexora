const crypto = require('crypto');
const Joi = require('joi');
const mongoose = require('mongoose');

const logger = require('@/logger');
const HttpError = require('@/handlers/httpError');
const { ROLES } = require('@/auth/permissions');
const { currentTenant, withoutTenant } = require('@/tenancy/context');
const { sendEmail, appLink } = require('@/services/email');
const { teamInvite } = require('@/emailTemplate');
const { startSession, sessionResult } = require('@/controllers/middlewaresControllers/createAuthMiddleware/session');
const {
  newOneTimeToken,
  isValidInviteToken,
  INVITE_TOKEN_TTL_MS,
} = require('@/controllers/middlewaresControllers/createAuthMiddleware/resetToken');

/*
  Team management: list members, invite by email, change roles, deactivate.
  Every query is scoped to the caller's organization by the tenant plugin.
*/

// There is exactly one owner (whoever created the organization); invites can't create another
const INVITABLE_ROLES = ROLES.filter((role) => role !== 'owner');

const Admin = () => mongoose.model('Admin');
const AdminPassword = () => mongoose.model('AdminPassword');

const statusOf = (user, passwordDoc) => {
  if (passwordDoc?.inviteToken) return 'invited';
  return user.enabled ? 'active' : 'disabled';
};

const memberView = (user, passwordDoc) => ({
  _id: user._id,
  name: user.name,
  surname: user.surname,
  email: user.email,
  role: user.role,
  photo: user.photo,
  status: statusOf(user, passwordDoc),
  invitedAt: user.invitedAt,
  inviteExpires: passwordDoc?.inviteToken ? passwordDoc.inviteTokenExpires : undefined,
});

const organizationName = async () =>
  (await mongoose.model('Organization').findById(currentTenant()).exec())?.name || 'your company';

/** Creates a fresh invite token, emails it, and returns the link if the email couldn't be sent. */
const sendInvite = async ({ user, inviter, req }) => {
  const { token, hash, expires } = newOneTimeToken(INVITE_TOKEN_TTL_MS);
  await AdminPassword()
    .updateOne({ user: user._id }, { $set: { inviteToken: hash, inviteTokenExpires: expires } })
    .exec();

  const link = appLink(`/accept-invite/${user._id}/${token}`);
  const message = teamInvite({
    name: user.name,
    inviterName: [inviter.name, inviter.surname].filter(Boolean).join(' ') || inviter.email,
    companyName: await organizationName(),
    role: user.role,
    link,
  });
  try {
    await sendEmail({ to: user.email, subject: message.subject, html: message.html, text: message.text });
    return { emailSent: true };
  } catch (error) {
    (req.log || logger).warn({ err: error }, 'Invite email could not be sent; returning the link to the inviter');
    // The inviter can share the link themselves (e.g. when email isn't configured yet)
    return { emailSent: false, inviteLink: link };
  }
};

/** Loads a member of the caller's organization, or 404. */
const findMember = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Team member not found');
  const user = await Admin().findOne({ _id: id, removed: false }).exec();
  if (!user) throw new HttpError(404, 'Team member not found');
  return user;
};

/** GET /api/team — everyone in the organization. */
exports.list = async (req, res) => {
  const users = await Admin().find({ removed: false }).sort({ created: 1 }).exec();
  const passwords = await AdminPassword()
    .find({ user: { $in: users.map((user) => user._id) } })
    .exec();
  const byUser = new Map(passwords.map((doc) => [String(doc.user), doc]));
  const result = users.map((user) => memberView(user, byUser.get(String(user._id))));
  return res.status(200).json({
    success: true,
    result,
    seats: result.filter((member) => member.status !== 'disabled').length,
    message: '',
  });
};

/** POST /api/team/invite { email, name?, role } */
exports.invite = async (req, res) => {
  const { error, value } = Joi.object({
    email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).max(254).required(),
    name: Joi.string().trim().max(100).allow(''),
    role: Joi.string()
      .valid(...INVITABLE_ROLES)
      .required(),
  }).validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  // Emails are unique across all organizations
  if (await withoutTenant(() => Admin().exists({ email: value.email }))) {
    throw new HttpError(409, 'This email already has a Nexora account.');
  }

  let user;
  try {
    user = await Admin().create({
      email: value.email,
      name: value.name || value.email.split('@')[0],
      surname: '',
      role: value.role,
      enabled: false,
      invitedBy: req.admin._id,
      invitedAt: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'This email already has a Nexora account.');
    throw error;
  }

  // Unusable until the invite is accepted and they choose a password
  const passwordDoc = new (AdminPassword())();
  const salt = crypto.randomUUID();
  passwordDoc.set({ user: user._id, salt, password: passwordDoc.generateHash(salt, crypto.randomBytes(32).toString('hex')) });
  await passwordDoc.save();

  const delivery = await sendInvite({ user, inviter: req.admin, req });
  return res.status(201).json({
    success: true,
    result: { member: memberView(user, { inviteToken: true }), ...delivery },
    message: delivery.emailSent
      ? `Invitation sent to ${user.email}.`
      : `Invitation created. Email isn't available, so share this link with ${user.email}.`,
  });
};

/** POST /api/team/:id/resend-invite */
exports.resendInvite = async (req, res) => {
  const user = await findMember(req.params.id);
  const passwordDoc = await AdminPassword().findOne({ user: user._id }).exec();
  if (!passwordDoc?.inviteToken) throw new HttpError(400, 'This person has already joined.');

  const delivery = await sendInvite({ user, inviter: req.admin, req });
  return res.status(200).json({
    success: true,
    result: delivery,
    message: delivery.emailSent ? `Invitation sent again to ${user.email}.` : 'Share the new invitation link.',
  });
};

/** PATCH /api/team/:id { role?, enabled? } — change role, deactivate or reactivate. */
exports.update = async (req, res) => {
  const { error, value } = Joi.object({
    role: Joi.string().valid(...INVITABLE_ROLES),
    enabled: Joi.boolean(),
  })
    .min(1)
    .validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  const user = await findMember(req.params.id);
  if (user.role === 'owner') throw new HttpError(403, "The organization owner's access can't be changed.");
  if (String(user._id) === String(req.admin._id)) {
    throw new HttpError(403, "You can't change your own role or access; ask another admin.");
  }
  const passwordDoc = await AdminPassword().findOne({ user: user._id }).exec();
  if (value.enabled === true && passwordDoc?.inviteToken) {
    throw new HttpError(400, 'This person has not accepted the invitation yet.');
  }

  const changes = {};
  if (value.role) changes.role = value.role;
  if (value.enabled !== undefined) changes.enabled = value.enabled;
  await Admin().updateOne({ _id: user._id }, { $set: changes }).exec();

  // Deactivated users and role changes take effect immediately: end their sessions
  if (value.enabled === false || value.role) {
    await AdminPassword().updateOne({ user: user._id }, { $set: { loggedSessions: [] } }).exec();
  }

  const updated = await Admin().findById(user._id).exec();
  return res.status(200).json({
    success: true,
    result: memberView(updated, passwordDoc),
    message: 'Team member updated',
  });
};

/** DELETE /api/team/:id — cancels a pending invitation (active members are deactivated instead). */
exports.revokeInvite = async (req, res) => {
  const user = await findMember(req.params.id);
  const passwordDoc = await AdminPassword().findOne({ user: user._id }).exec();
  if (!passwordDoc?.inviteToken) {
    throw new HttpError(400, 'Only pending invitations can be cancelled. Deactivate active members instead.');
  }
  // Frees the email so it can be invited again (here or elsewhere)
  await Admin().deleteOne({ _id: user._id }).exec();
  await AdminPassword().deleteOne({ _id: passwordDoc._id }).exec();
  return res.status(200).json({ success: true, result: null, message: 'Invitation cancelled' });
};

const inviteParams = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  token: Joi.string().max(200).required(),
});

/** Finds a pending, valid invite (public routes: no tenant yet, so the lookup is unscoped). */
const findInvite = async ({ userId, token }) => {
  const [user, passwordDoc] = await withoutTenant(() =>
    Promise.all([
      Admin().findOne({ _id: userId, removed: false }).exec(),
      AdminPassword().findOne({ user: userId, removed: false }).exec(),
    ])
  );
  if (!user || !passwordDoc || !isValidInviteToken(token, passwordDoc)) {
    throw new HttpError(403, 'This invitation is invalid or has expired. Ask for a new one.');
  }
  return { user, passwordDoc };
};

/** GET /api/invite/:userId/:token — what the accept page shows before the user signs in. */
exports.inviteDetails = async (req, res) => {
  const { error, value } = inviteParams.validate(req.params);
  if (error) throw new HttpError(400, 'Invalid invitation link');
  const { user } = await findInvite(value);
  const organization = await mongoose.model('Organization').findById(user.organizationId).exec();
  return res.status(200).json({
    success: true,
    result: { email: user.email, name: user.name, role: user.role, organizationName: organization?.name },
    message: '',
  });
};

/** POST /api/accept-invite { userId, token, name, surname?, password } — joins and logs in. */
exports.acceptInvite = async (req, res) => {
  const { error, value } = inviteParams
    .keys({
      name: Joi.string().trim().min(1).max(100).required(),
      surname: Joi.string().trim().max(100).allow(''),
      password: Joi.string().min(8).max(200).required(),
    })
    .validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  const { user, passwordDoc } = await findInvite(value);

  const salt = crypto.randomUUID();
  await withoutTenant(async () => {
    await AdminPassword()
      .updateOne(
        { _id: passwordDoc._id },
        {
          $set: { salt, password: passwordDoc.generateHash(salt, value.password), emailVerified: true },
          $unset: { inviteToken: 1, inviteTokenExpires: 1 },
        }
      )
      .exec();
    await Admin()
      .updateOne({ _id: user._id }, { $set: { enabled: true, name: value.name, surname: value.surname || '' } })
      .exec();
  });

  const joined = await withoutTenant(() => Admin().findById(user._id).exec());
  const token = await startSession({ user: joined, UserPasswordModel: AdminPassword() });
  return res.status(200).json({
    success: true,
    result: sessionResult({ user: joined, token, emailVerified: true }),
    message: 'Welcome to the team!',
  });
};
