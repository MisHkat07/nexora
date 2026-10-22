const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const mongoose = require('mongoose');

const { isValidResetToken } = require('./resetToken');
const { withoutTenant } = require('@/tenancy/context');

const invalidLink = (res) =>
  res.status(403).json({
    success: false,
    result: null,
    message: 'This reset link is invalid or has expired. Please request a new one.',
  });

const resetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { password, userId, resetToken } = req.body;

  // validate
  const objectSchema = Joi.object({
    password: Joi.string().min(8).max(200).required(),
    userId: Joi.string().hex().length(24).required(),
    resetToken: Joi.string().max(200).required(),
  });

  const { error } = objectSchema.validate({ password, userId, resetToken });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: error.details[0].message,
    });
  }

  const [user, databasePassword] = await withoutTenant(() => Promise.all([
    User.findOne({ _id: userId, removed: false }).exec(),
    UserPassword.findOne({ user: userId, removed: false }).exec(),
  ]));

  if (!user || !databasePassword || !isValidResetToken(resetToken, databasePassword)) {
    return invalidLink(res);
  }

  if (!user.enabled)
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled, contact your account adminstrator',
    });

  const salt = crypto.randomUUID();
  const hashedPassword = bcrypt.hashSync(salt + password);

  const token = jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h', jwtid: crypto.randomUUID() }
  );

  // The token is single-use, and every existing session is signed out
  await UserPassword.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        loggedSessions: [token],
        password: hashedPassword,
        salt: salt,
        emailVerified: true,
      },
      $unset: { resetToken: 1, resetTokenExpires: 1 },
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result: {
      _id: user._id,
      name: user.name,
      surname: user.surname,
      role: user.role,
      email: user.email,
      photo: user.photo,
      token: token,
      maxAge: req.body.remember ? 365 : null,
    },
    message: 'Successfully resetPassword user',
  });
};

module.exports = resetPassword;
