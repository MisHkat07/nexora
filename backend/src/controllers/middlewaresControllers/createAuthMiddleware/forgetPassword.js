const Joi = require('joi');
const crypto = require('crypto');

const mongoose = require('mongoose');

const checkAndCorrectURL = require('./checkAndCorrectURL');
const sendMail = require('./sendMail');
const { hashResetToken, RESET_TOKEN_TTL_MS } = require('./resetToken');

const { useAppSettings } = require('@/settings');

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

  const user = await User.findOne({ email: email.toLowerCase(), removed: false });
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

  const settings = useAppSettings();
  const idurar_app_email = settings['idurar_app_email'];
  const idurar_base_url = settings['idurar_base_url'];

  const url = checkAndCorrectURL(idurar_base_url);

  const link = url + '/resetpassword/' + user._id + '/' + resetToken;

  await sendMail({
    email: user.email,
    name: user.name,
    link,
    subject: 'Reset your password',
    idurar_app_email,
    type: 'passwordVerfication',
  });

  return res.status(200).json(genericResponse);
};

module.exports = forgetPassword;
