const bcrypt = require('bcryptjs');

const { createSession } = require('@/auth/sessions');
const { record } = require('@/audit/record');
const { challengeResponse } = require('@/controllers/coreControllers/twoFactor');
const { loginResponse } = require('@/controllers/coreControllers/sessionsController');

const authUser = async (req, res, { user, databasePassword, password }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch) {
    await record({
      req,
      action: 'login_failed',
      entity: 'auth',
      entityId: user._id,
      organizationId: user.organizationId,
      userId: user._id,
    });
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }

  if (databasePassword.totpEnabled) return challengeResponse(res, user);

  const remember = Boolean(req.body.remember);
  const { token } = await createSession({ user, req, res, remember });
  await record({
    req,
    action: 'login',
    entity: 'auth',
    entityId: user._id,
    organizationId: user.organizationId,
    userId: user._id,
  });

  return loginResponse(res, {
    user,
    passwordDoc: databasePassword,
    token,
    remember,
    message: 'Successfully login user',
  });
};

module.exports = authUser;
