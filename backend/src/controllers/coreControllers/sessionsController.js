const mongoose = require('mongoose');

const {
  refreshSession,
  signAccessToken,
  clearRefreshCookie,
  revokeSession,
  revokeUserSessions,
  sessionResult,
} = require('@/auth/sessions');
const { accountFlags } = require('@/auth/account');
const { withoutTenant } = require('@/tenancy/context');

const User = () => mongoose.model('Admin');
const UserPassword = () => mongoose.model('AdminPassword');
const Session = () => mongoose.model('Session');

const unauthorized = (res) => {
  clearRefreshCookie(res);
  return res.status(401).json({
    success: false,
    result: null,
    message: 'Your session has ended. Please log in again.',
    jwtExpired: true,
  });
};

const payloadFor = async (user, passwordDoc, token, remember) => {
  const flags = await accountFlags(user, passwordDoc);
  return sessionResult({
    user,
    token,
    remember,
    emailVerified: passwordDoc?.emailVerified,
    ...flags,
  });
};

/** POST /api/auth/refresh — exchanges the httpOnly cookie for a new 15-minute access token. */
const refresh = async (req, res) => {
  const refreshed = await refreshSession({ req, res });
  if (!refreshed) return unauthorized(res);

  const [user, passwordDoc] = await withoutTenant(() =>
    Promise.all([
      User().findOne({ _id: refreshed.userId, removed: false }).exec(),
      UserPassword().findOne({ user: refreshed.userId, removed: false }).exec(),
    ])
  );

  if (!user || !passwordDoc || !user.enabled || !user.organizationId) {
    await revokeSession(refreshed.session._id);
    return unauthorized(res);
  }

  const token = signAccessToken(user, refreshed.session._id);
  return res.status(200).json({
    success: true,
    result: await payloadFor(user, passwordDoc, token, refreshed.session.remember),
    message: 'Session refreshed',
  });
};

const activeFilter = (userId) => ({
  user: userId,
  revokedAt: { $exists: false },
  expiresAt: { $gt: new Date() },
});

const view = (session, currentId) => ({
  id: session._id,
  userAgent: session.userAgent || 'Unknown device',
  ip: session.ip || '',
  created: session.created,
  lastUsedAt: session.lastUsedAt,
  remember: Boolean(session.remember),
  current: String(session._id) === String(currentId),
});

/** GET /api/auth/sessions — this user's active sessions. */
const list = async (req, res) => {
  const sessions = await Session().find(activeFilter(req.admin._id)).sort({ lastUsedAt: -1 }).lean();
  return res.status(200).json({
    success: true,
    result: sessions.map((session) => view(session, req.sessionId)),
    message: '',
  });
};

/** DELETE /api/auth/sessions/:id — ends one of this user's sessions. */
const revokeOne = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, result: null, message: 'Unknown session' });
  }
  const session = await Session().findOne({ _id: req.params.id, user: req.admin._id }).exec();
  if (!session) {
    return res.status(404).json({ success: false, result: null, message: 'Session not found' });
  }
  await revokeSession(session._id);
  if (String(session._id) === String(req.sessionId)) clearRefreshCookie(res);
  return res.status(200).json({ success: true, result: null, message: 'Session ended' });
};

/** POST /api/auth/logout-all — ends every session, including this one. */
const revokeAll = async (req, res) => {
  await revokeUserSessions(req.admin._id);
  clearRefreshCookie(res);
  return res.status(200).json({ success: true, result: null, message: 'Signed out everywhere' });
};

/** A signed-in user after password reset or another flow that starts a fresh session. */
const loginResponse = async (res, { user, passwordDoc, token, remember, message, status = 200 }) =>
  res.status(status).json({
    success: true,
    result: await payloadFor(user, passwordDoc, token, remember),
    message,
  });

module.exports = { refresh, list, revokeOne, revokeAll, loginResponse };
