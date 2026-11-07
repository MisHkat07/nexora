const crypto = require('crypto');
const { authenticator } = require('otplib');

authenticator.options = { window: 1, step: 30 };

const ISSUER = 'Nexora';
const RECOVERY_COUNT = 10;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const key = () => crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();

/** Encrypts the TOTP secret at rest. It has to be reversible, so it is not hashed. */
const encrypt = (text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
};

const decrypt = (payload) => {
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const hashCode = (code) =>
  crypto.createHash('sha256').update(String(code).replace(/[\s-]/g, '').toUpperCase()).digest('hex');

const generateSecret = () => authenticator.generateSecret();

const keyuri = (email, secret) => authenticator.keyuri(email, ISSUER, secret);

const verifyTotp = (code, secret) => {
  const token = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
};

const generateRecoveryCodes = () => {
  const codes = [];
  for (let i = 0; i < RECOVERY_COUNT; i += 1) {
    const bytes = crypto.randomBytes(8);
    const chars = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]);
    codes.push(`${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`);
  }
  return codes;
};

/** Uses one unused recovery code. Returns the updated list, or null if none matched. */
const consumeRecoveryCode = (codes, presented) => {
  const presentedHash = hashCode(presented);
  const list = (Array.isArray(codes) ? codes : []).map((entry) => {
    const plain = typeof entry?.toObject === 'function' ? entry.toObject() : entry;
    return { hash: plain.hash, used: Boolean(plain.used) };
  });
  const match = list.find((entry) => !entry.used && entry.hash === presentedHash);
  if (!match) return null;
  match.used = true;
  return list;
};

module.exports = {
  encrypt,
  decrypt,
  hashCode,
  generateSecret,
  keyuri,
  verifyTotp,
  generateRecoveryCodes,
  consumeRecoveryCode,
};
