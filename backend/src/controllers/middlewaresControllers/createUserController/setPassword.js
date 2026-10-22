const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const HttpError = require('@/handlers/httpError');

const MIN_LENGTH = 8;

// The public demo deployment keeps its demo account's password fixed
const isLockedDemoAccount = (user) =>
  process.env.DEMO_MODE === 'true' && user.email === 'admin@demo.com';

/**
 * Validates and stores a new password for `userId`, then signs out every session
 * except `keepSessionToken` (the caller's own session, if they changed their own password).
 */
const setPassword = async ({ userModel, userId, user, password, keepSessionToken }) => {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    throw new HttpError(400, `The password needs to be at least ${MIN_LENGTH} characters long.`);
  }
  if (password.length > 200) throw new HttpError(400, 'The password is too long.');
  if (isLockedDemoAccount(user)) throw new HttpError(403, "you couldn't update demo password");

  const UserPassword = mongoose.model(userModel + 'Password');
  const salt = crypto.randomUUID();

  const result = await UserPassword.findOneAndUpdate(
    { user: userId, removed: false },
    {
      $set: {
        password: bcrypt.hashSync(salt + password),
        salt,
        loggedSessions: keepSessionToken ? [keepSessionToken] : [],
      },
    }
  ).exec();

  if (!result) throw new HttpError(404, 'User not found');
};

module.exports = setPassword;
