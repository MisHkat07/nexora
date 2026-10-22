const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { permissionsFor } = require('@/auth/permissions');

/** Signs a session token for the user and records it, so it can be revoked on logout. */
const startSession = async ({ user, UserPasswordModel, remember = false }) => {
  const token = jwt.sign(
    {
      id: user._id,
    },
    process.env.JWT_SECRET,
    // jwtid keeps every session token unique, so sessions can be revoked one by one
    { expiresIn: remember ? 365 * 24 + 'h' : '24h', jwtid: crypto.randomUUID() }
  );

  await UserPasswordModel.findOneAndUpdate(
    { user: user._id },
    { $push: { loggedSessions: token } }
  ).exec();

  return token;
};

/** What login and signup return to the frontend. */
const sessionResult = ({ user, token, remember = false, emailVerified }) => ({
  _id: user._id,
  name: user.name,
  surname: user.surname,
  role: user.role,
  // The UI hides what the role can't do; the server enforces it regardless
  permissions: permissionsFor(user.role),
  email: user.email,
  photo: user.photo,
  emailVerified: Boolean(emailVerified),
  token,
  maxAge: remember ? 365 : null,
});

module.exports = { startSession, sessionResult };
