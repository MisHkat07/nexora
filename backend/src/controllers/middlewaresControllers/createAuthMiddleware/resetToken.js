const crypto = require('crypto');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Constant-time check of a reset token against the stored hash and its expiry. */
const isValidResetToken = (token, databasePassword) => {
  const { resetToken: storedHash, resetTokenExpires } = databasePassword;
  if (!storedHash || !resetTokenExpires || resetTokenExpires.getTime() < Date.now()) return false;
  const given = Buffer.from(hashResetToken(token), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
};

module.exports = { hashResetToken, isValidResetToken, RESET_TOKEN_TTL_MS };
