const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const config = require('@/config');
const { permissionsFor } = require('./permissions');

/*
  Login sessions.

  - Access token: a JWT valid for 15 minutes, kept in memory by the frontend and sent as
    "Authorization: Bearer". It names its session (sid), so revoking the session ends it.
  - Refresh token: "<sessionId>.<secret>" in an httpOnly cookie that page scripts can't read,
    sent only to /api/auth. Each refresh replaces the secret. Presenting an old secret again
    (outside a short grace period for parallel tabs) means it was copied: the session is revoked.
*/

const COOKIE_NAME = 'nexora_rt';
const COOKIE_PATH = '/api/auth';
const ACCESS_TOKEN_TTL = '15m';
const SESSION_TTL_MS = { remember: 30 * 24 * 60 * 60 * 1000, normal: 24 * 60 * 60 * 1000 };
const ROTATION_GRACE_MS = 30 * 1000;

const Session = () => mongoose.model('Session');
const hash = (secret) => crypto.createHash('sha256').update(secret).digest('hex');
const newSecret = () => crypto.randomBytes(32).toString('hex');

const signAccessToken = (user, sessionId) =>
  jwt.sign({ id: user._id, sid: String(sessionId) }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    jwtid: crypto.randomUUID(),
  });

const setRefreshCookie = (res, session, secret) =>
  res.cookie(COOKIE_NAME, `${session._id}.${secret}`, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
    expires: session.expiresAt,
  });

const clearRefreshCookie = (res) =>
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: config.isProduction, sameSite: 'lax', path: COOKIE_PATH });

/** Reads the refresh cookie without a cookie-parsing dependency. */
const readRefreshCookie = (req) => {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) {
      const [sessionId, secret] = decodeURIComponent(rest.join('=')).split('.');
      if (mongoose.isValidObjectId(sessionId) && /^[0-9a-f]{64}$/.test(secret || '')) return { sessionId, secret };
    }
  }
  return null;
};

/** What login, signup, refresh and invite acceptance return to the frontend. */
const sessionResult = ({
  user,
  token,
  remember = false,
  emailVerified,
  twoFactorEnabled = false,
  mustEnrollTwoFactor = false,
}) => ({
  _id: user._id,
  name: user.name,
  surname: user.surname,
  role: user.role,
  // The UI hides what the role can't do; the server enforces it regardless
  permissions: permissionsFor(user.role),
  email: user.email,
  photo: user.photo,
  emailVerified: Boolean(emailVerified),
  twoFactorEnabled: Boolean(twoFactorEnabled),
  mustEnrollTwoFactor: Boolean(mustEnrollTwoFactor),
  token,
  maxAge: remember ? 30 : null,
});

/** Starts a session: stores it, sets the refresh cookie, returns the access token. */
const createSession = async ({ user, req, res, remember = false }) => {
  const secret = newSecret();
  const session = await Session().create({
    user: user._id,
    organizationId: user.organizationId,
    secretHash: hash(secret),
    remember,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    ip: req.ip,
    expiresAt: new Date(Date.now() + (remember ? SESSION_TTL_MS.remember : SESSION_TTL_MS.normal)),
  });
  setRefreshCookie(res, session, secret);
  return { session, token: signAccessToken(user, session._id) };
};

/** An active (not revoked, not expired) session, or null. */
const findActiveSession = async (sessionId) => {
  if (!mongoose.isValidObjectId(sessionId)) return null;
  const session = await Session().findById(sessionId).exec();
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
  return session;
};

/**
 * Exchanges the refresh cookie for a new access token, rotating the secret.
 * Returns { user, token, session } or null (and revokes the session if the token was reused).
 */
const refreshSession = async ({ req, res }) => {
  const cookie = readRefreshCookie(req);
  if (!cookie) return null;
  const session = await findActiveSession(cookie.sessionId);
  if (!session) return null;

  const presented = hash(cookie.secret);
  if (presented === session.secretHash) {
    const secret = newSecret();
    const rotated = await Session()
      .findOneAndUpdate(
        { _id: session._id, secretHash: session.secretHash, revokedAt: { $exists: false } },
        {
          $set: {
            secretHash: hash(secret),
            previousSecretHash: session.secretHash,
            rotatedAt: new Date(),
            lastUsedAt: new Date(),
          },
        },
        { new: true }
      )
      .exec();
    // Another tab rotated it a moment ago: fall through to the grace check below
    if (rotated) {
      setRefreshCookie(res, rotated, secret);
      return { session: rotated, userId: rotated.user };
    }
  }

  const fresh = await Session().findById(session._id).exec();
  const withinGrace =
    fresh?.previousSecretHash === presented && fresh.rotatedAt && Date.now() - fresh.rotatedAt.getTime() < ROTATION_GRACE_MS;
  if (withinGrace) return { session: fresh, userId: fresh.user };

  // An old refresh token was used again: assume it was stolen and end the session
  await Session().updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } }).exec();
  return null;
};

const revokeSession = (sessionId) =>
  Session().updateOne({ _id: sessionId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }).exec();

/** Ends all of a user's sessions, optionally keeping one (the one making the request). */
const revokeUserSessions = (userId, { except } = {}) =>
  Session()
    .updateMany(
      { user: userId, revokedAt: { $exists: false }, ...(except && { _id: { $ne: except } }) },
      { $set: { revokedAt: new Date() } }
    )
    .exec();

module.exports = {
  COOKIE_NAME,
  ACCESS_TOKEN_TTL,
  signAccessToken,
  createSession,
  refreshSession,
  findActiveSession,
  revokeSession,
  revokeUserSessions,
  readRefreshCookie,
  clearRefreshCookie,
  sessionResult,
};
