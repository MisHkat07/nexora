const Joi = require('joi');

const mongoose = require('mongoose');

const authUser = require('./authUser');
const { withoutTenant } = require('@/tenancy/context');

const login = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const { email, password } = req.body;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
  });

  const { error } = objectSchema.validate({ email, password });
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }

  // Before login the organization is unknown: find the user across organizations
  const user = await withoutTenant(() => UserModel.findOne({ email: email, removed: false }));

  const databasePassword =
    user && (await UserPasswordModel.findOne({ user: user._id, removed: false }));

  // Same answer as a wrong password, so the login form can't be used to discover accounts
  if (!user || !databasePassword)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  if (!user.enabled)
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled, contact your account adminstrator',
    });

  //  authUser if your has correct password
  authUser(req, res, {
    user,
    databasePassword,
    password,
    UserPasswordModel,
  });
};

module.exports = login;
