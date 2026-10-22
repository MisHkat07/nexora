const bcrypt = require('bcryptjs');

const { startSession, sessionResult } = require('./session');

const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  const remember = Boolean(req.body.remember);
  const token = await startSession({ user, UserPasswordModel, remember });

  return res.status(200).json({
    success: true,
    result: sessionResult({ user, token, remember, emailVerified: databasePassword.emailVerified }),
    message: 'Successfully login user',
  });
};

module.exports = authUser;
