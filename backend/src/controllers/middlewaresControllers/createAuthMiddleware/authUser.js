const bcrypt = require('bcryptjs');

const { createSession, sessionResult } = require('@/auth/sessions');

const authUser = async (req, res, { user, databasePassword, password }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  const remember = Boolean(req.body.remember);
  const { token } = await createSession({ user, req, res, remember });

  return res.status(200).json({
    success: true,
    result: sessionResult({ user, token, remember, emailVerified: databasePassword.emailVerified }),
    message: 'Successfully login user',
  });
};

module.exports = authUser;
