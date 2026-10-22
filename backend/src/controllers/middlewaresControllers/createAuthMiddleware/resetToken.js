const crypto = require('crypto');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** A new random token: the plain value goes in the email, only the hash is stored. */
const newOneTimeToken = (ttlMs) => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashResetToken(token), expires: new Date(Date.now() + ttlMs) };
};

/** Constant-time check of a token against a stored hash and its expiry. */
const matchesHashedToken = (token, storedHash, expires) => {
  if (!storedHash || !expires || expires.getTime() < Date.now()) return false;
  const given = Buffer.from(hashResetToken(token), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
};

const isValidResetToken = (token, databasePassword) =>
  matchesHashedToken(token, databasePassword.resetToken, databasePassword.resetTokenExpires);

const isValidEmailToken = (token, databasePassword) =>
  matchesHashedToken(token, databasePassword.emailToken, databasePassword.emailTokenExpires);

const isValidInviteToken = (token, databasePassword) =>
  matchesHashedToken(token, databasePassword.inviteToken, databasePassword.inviteTokenExpires);

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

module.exports = {
  hashResetToken,
  newOneTimeToken,
  isValidResetToken,
  isValidEmailToken,
  isValidInviteToken,
  RESET_TOKEN_TTL_MS,
  EMAIL_TOKEN_TTL_MS,
  INVITE_TOKEN_TTL_MS,
};
