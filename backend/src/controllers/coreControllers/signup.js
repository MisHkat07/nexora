const Joi = require('joi');
const mongoose = require('mongoose');

const config = require('@/config');
const logger = require('@/logger');
const HttpError = require('@/handlers/httpError');
const { createOrganization } = require('@/tenancy/createOrganization');
const { withoutTenant } = require('@/tenancy/context');
const { sendEmail, appLink, missingConfiguration } = require('@/services/email');
const { verifyEmail } = require('@/emailTemplate');
const { startSession, sessionResult } = require('@/controllers/middlewaresControllers/createAuthMiddleware/session');
const {
  newOneTimeToken,
  isValidEmailToken,
  EMAIL_TOKEN_TTL_MS,
} = require('@/controllers/middlewaresControllers/createAuthMiddleware/resetToken');

const registerSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: true } }).max(254).required(),
  password: Joi.string().min(8).max(200).required(),
  country: Joi.string().trim().max(100).allow(''),
});

/** Sends (or re-sends) the address-verification email. Returns false if it couldn't be sent. */
const sendVerification = async ({ user, companyName, req }) => {
  const { token, hash, expires } = newOneTimeToken(EMAIL_TOKEN_TTL_MS);
  await mongoose
    .model('AdminPassword')
    .updateOne({ user: user._id }, { $set: { emailToken: hash, emailTokenExpires: expires } })
    .exec();

  const link = appLink(`/verify-email/${user._id}/${token}`);
  const message = verifyEmail({ name: user.name, link, companyName });
  try {
    await sendEmail({ to: user.email, subject: message.subject, html: message.html, text: message.text });
    return true;
  } catch (error) {
    (req.log || logger).error({ err: error }, 'Verification email could not be sent');
    return false;
  }
};

/** GET /api/public-config — what the login page needs to know before anyone is logged in. */
exports.publicConfig = async (req, res) =>
  res.status(200).json({ success: true, result: { signupEnabled: config.signupEnabled }, message: '' });

/**
 * POST /api/register — creates an organization with its owner and logs them in.
 * The account starts unverified: everything works except emailing customers.
 */
exports.register = async (req, res) => {
  if (!config.signupEnabled) throw new HttpError(404, 'Signup is not enabled on this server.');

  const { error, value } = registerSchema.validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  if (await withoutTenant(() => mongoose.model('Admin').exists({ email: value.email }))) {
    throw new HttpError(409, 'An account with this email already exists. Log in or reset your password.');
  }

  // Without an email provider nobody could ever verify; in development, verify immediately
  const autoVerify = Boolean(missingConfiguration()) && !config.isProduction;

  let admin;
  const session = await mongoose.startSession();
  try {
    // The new organization doesn't exist yet; createOrganization sets organizationId on every document
    await withoutTenant(() =>
      session.withTransaction(async () => {
        ({ admin } = await createOrganization({
          name: value.companyName,
          owner: { email: value.email, name: value.name, password: value.password },
          country: value.country || undefined,
          emailVerified: autoVerify,
          session,
        }));
      })
    );
  } catch (error) {
    // Two signups with the same email at once: the unique index stops the second
    if (error.code === 11000) {
      throw new HttpError(409, 'An account with this email already exists. Log in or reset your password.');
    }
    throw error;
  } finally {
    await session.endSession();
  }

  const verificationSent = autoVerify ? false : await sendVerification({ user: admin, companyName: value.companyName, req });

  const UserPasswordModel = mongoose.model('AdminPassword');
  const token = await startSession({ user: admin, UserPasswordModel });

  return res.status(201).json({
    success: true,
    result: { ...sessionResult({ user: admin, token, emailVerified: autoVerify }), verificationSent },
    message: autoVerify
      ? 'Your account is ready.'
      : verificationSent
        ? `Your account is ready. We sent a confirmation link to ${admin.email}.`
        : "Your account is ready. We couldn't send the confirmation email yet; use \"Resend link\" later.",
  });
};

/** POST /api/verify-email { userId, token } — confirms the address from the emailed link. */
exports.verifyEmail = async (req, res) => {
  const { error, value } = Joi.object({
    userId: Joi.string().hex().length(24).required(),
    token: Joi.string().max(200).required(),
  }).validate(req.body);
  if (error) throw new HttpError(400, error.details[0].message);

  const UserPassword = mongoose.model('AdminPassword');
  const passwordDoc = await UserPassword.findOne({ user: value.userId, removed: false }).exec();

  if (passwordDoc?.emailVerified) {
    return res.status(200).json({ success: true, result: null, message: 'Your email address is already confirmed.' });
  }
  if (!passwordDoc || !isValidEmailToken(value.token, passwordDoc)) {
    throw new HttpError(403, 'This confirmation link is invalid or has expired. Log in to request a new one.');
  }

  await UserPassword.updateOne(
    { _id: passwordDoc._id },
    { $set: { emailVerified: true }, $unset: { emailToken: 1, emailTokenExpires: 1 } }
  ).exec();

  return res.status(200).json({ success: true, result: null, message: 'Thanks! Your email address is confirmed.' });
};

/** POST /api/resend-verification (logged in) — sends a fresh confirmation link. */
exports.resendVerification = async (req, res) => {
  if (req.emailVerified) {
    return res.status(200).json({ success: true, result: null, message: 'Your email address is already confirmed.' });
  }
  const { company_name } = await require('@/middlewares/settings').loadSettings();
  const sent = await sendVerification({ user: req.admin, companyName: company_name || 'your company', req });
  if (!sent) throw new HttpError(502, 'The confirmation email could not be sent. Please try again later.');
  return res.status(200).json({ success: true, result: null, message: `We sent a new link to ${req.admin.email}.` });
};
