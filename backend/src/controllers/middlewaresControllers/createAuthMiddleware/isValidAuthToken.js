const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const { sendError } = require('@/handlers/errorHandlers');
const { withoutTenant, setCurrentTenant } = require('@/tenancy/context');
const { findActiveSession } = require('@/auth/sessions');
const { accountFlags } = require('@/auth/account');

// Until 2FA is enrolled, the account can load the shell and finish setup, and nothing else
const enrollmentAllowed = (req) => {
  const path = (req.originalUrl || '').split('?')[0];
  if (req.method === 'GET' && (path.startsWith('/api/setting') || path === '/api/organization')) return true;
  if (path === '/api/logout' || path === '/api/auth/logout' || path === '/api/auth/logout-all') return true;
  if (path.startsWith('/api/auth/2fa/') || path.startsWith('/api/auth/sessions')) return true;
  if (path.startsWith('/api/admin/profile')) return true;
  return false;
};

const unauthorized = (res, message) =>
  res.status(401).json({
    success: false,
    result: null,
    message,
    jwtExpired: true,
  });

const isValidAuthToken = async (req, res, next, { userModel, jwtSecret = 'JWT_SECRET' }) => {
  try {
    const UserPassword = mongoose.model(userModel + 'Password');
    const User = mongoose.model(userModel);

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token

    if (!token) return unauthorized(res, 'No authentication token, authorization denied.');

    let verified;
    try {
      verified = jwt.verify(token, process.env[jwtSecret]);
    } catch (error) {
      return unauthorized(res, 'Token verification failed, authorization denied.');
    }

    // Access tokens name their session (sid); download links are signed with the same secret
    // but have an audience, and must not work as session tokens
    if (!verified.id || !verified.sid || verified.aud)
      return unauthorized(res, 'Token verification failed, authorization denied.');

    // The organization isn't known until we have the user, so this one lookup is unscoped
    const [user, userPassword, session] = await withoutTenant(() =>
      Promise.all([
        User.findOne({ _id: verified.id, removed: false }).exec(),
        UserPassword.findOne({ user: verified.id, removed: false }).exec(),
        findActiveSession(verified.sid),
      ])
    );

    if (!user || !userPassword)
      return unauthorized(res, "User doesn't exist, authorization denied.");

    if (!user.organizationId) return unauthorized(res, 'Your account is not linked to an organization.');

    if (!user.enabled) return unauthorized(res, 'Your account is disabled.');

    // Logged out, revoked from another device, or ended by a password or role change
    if (!session || String(session.user) !== String(user._id))
      return unauthorized(res, 'Your session has ended. Please log in again.');

    const reqUserName = userModel.toLowerCase();
    req[reqUserName] = user;
    req.authToken = token;
    req.sessionId = session._id;
    req.emailVerified = Boolean(userPassword.emailVerified);
    // From here on, every query in this request is limited to the user's organization
    setCurrentTenant(user.organizationId);

    const flags = await accountFlags(user, userPassword);
    req.mustEnrollTwoFactor = flags.mustEnrollTwoFactor;
    if (flags.mustEnrollTwoFactor && !enrollmentAllowed(req)) {
      return res.status(403).json({
        success: false,
        result: null,
        message: 'Your organization requires two-factor authentication. Set it up to continue.',
        code: 'two_factor_enrollment_required',
      });
    }

    // lastUsed is for the session list; writing it on every request would hammer the database
    if (!session.lastUsedAt || Date.now() - new Date(session.lastUsedAt).getTime() > 5 * 60 * 1000) {
      mongoose.model('Session').updateOne({ _id: session._id }, { $set: { lastUsedAt: new Date() } }).exec();
    }
    next();
  } catch (error) {
    return sendError(error, req, res);
  }
};

module.exports = isValidAuthToken;
