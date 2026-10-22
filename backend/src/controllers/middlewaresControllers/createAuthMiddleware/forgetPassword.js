const Joi = require('joi');
const crypto = require('crypto');

const mongoose = require('mongoose');

const { hashResetToken, RESET_TOKEN_TTL_MS } = require('./resetToken');

const { sendEmail, appLink } = require('@/services/email');
const { passwordReset } = require('@/emailTemplate');
const { loadSettings } = require('@/middlewares/settings');
const logger = require('@/logger');
const { withTenant, withoutTenant } = require('@/tenancy/context');

// Same response whether or not the account exists, so this can't be used to discover emails
const genericResponse = {
  success: true,
  result: null,
  message: 'If an account exists for this email, we sent a link to reset your password.',
};

const forgetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { email } = req.body;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
  });

  const { error } = objectSchema.validate({ email });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid email.',
      errorMessage: error.message,
    });
  }

  const user = await withoutTenant(() => User.findOne({ email: email.toLowerCase(), removed: false }));
  if (!user || !user.enabled) return res.status(200).json(genericResponse);

  // Only a hash of the token is stored; the token itself only ever appears in the email
  const resetToken = crypto.randomBytes(32).toString('hex');
  const updated = await UserPassword.findOneAndUpdate(
    { user: user._id, removed: false },
    {
      resetToken: hashResetToken(resetToken),
      resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    }
  ).exec();
  if (!updated) return res.status(200).json(genericResponse);

  // The link must point at this app (APP_URL); the token is only valid for one hour
  const link = appLink(`/resetpassword/${user._id}/${resetToken}`);
  const { company_name } = await withTenant(user.organizationId, () => loadSettings());
  const message = passwordReset({ name: user.name, link, companyName: company_name || 'Nexora' });

  try {
    await sendEmail({ to: user.email, subject: message.subject, html: message.html, text: message.text });
  } catch (error) {
    // Same response either way (no account discovery), but make the failure visible to operators
    (req.log || logger).error({ err: error }, 'Password reset email could not be sent');
  }

  return res.status(200).json(genericResponse);
};

module.exports = forgetPassword;
