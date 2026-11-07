const jwt = require('jsonwebtoken');

const {
  readRefreshCookie,
  clearRefreshCookie,
  revokeSession,
} = require('@/auth/sessions');

// Ends this device's session. Works with the access token, or with only the refresh cookie
// (e.g. when the access token has already expired), so logging out always succeeds.
const logout = async (req, res) => {
  const cookie = readRefreshCookie(req);
  if (cookie) await revokeSession(cookie.sessionId);

  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (token) {
    try {
      const { sid } = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      if (sid) await revokeSession(sid);
    } catch {
      // An invalid token has nothing to revoke
    }
  }

  clearRefreshCookie(res);
  return res.json({
    success: true,
    result: {},
    message: 'Successfully logout',
  });
};

module.exports = logout;
