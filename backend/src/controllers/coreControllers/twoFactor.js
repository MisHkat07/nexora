const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const HttpError = require('@/handlers/httpError');
const { withoutTenant } = require('@/tenancy/context');
const { record } = require('@/audit/record');
const { createSession } = require('@/auth/sessions');
const { loginResponse } = require('./sessionsController');
const {
  encrypt,
  decrypt,
  generateSecret,
  keyuri,
  verifyTotp,
  generateRecoveryCodes,
  hashCode,
  consumeRecoveryCode,
} = require('@/auth/totp');

const User = () => mongoose.model('Admin');
const UserPassword = () => mongoose.model('AdminPassword');

const signTicket = (userId) =>
  jwt.sign({ id: String(userId), purpose: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });

const readTicket = (ticket) => {
  try {
    const payload = jwt.verify(ticket, process.env.JWT_SECRET);
    if (payload?.purpose !== '2fa' || !payload.id) return null;
    return payload;
  } catch {
    return null;
  }
};

/** Password matched and 2FA is on: no session until a code is presented. */
const challengeResponse = (res, user) =>
  res.status(200).json({
    success: true,
    result: { twoFactorRequired: true, ticket: signTicket(user._id) },
    message: 'Enter the code from your authenticator app.',
  });

exports.challengeResponse = challengeResponse;

const verifyPresented = (passwordDoc, { code, recoveryCode }) => {
  if (recoveryCode) {
    const next = consumeRecoveryCode(passwordDoc.recoveryCodes, recoveryCode);
    if (!next) return null;
    return { recoveryCodes: next, usedRecovery: true };
  }
  let secret;
  try {
    secret = decrypt(passwordDoc.totpSecret);
  } catch {
    return null;
  }
  if (!verifyTotp(code, secret)) return null;
  return { usedRecovery: false };
};

/** POST /api/auth/2fa/challenge { ticket, code? , recoveryCode? } */
exports.challenge = async (req, res) => {
  const payload = readTicket(req.body?.ticket);
  if (!payload) throw new HttpError(401, 'This sign-in step has expired. Enter your password again.');

  const [user, passwordDoc] = await withoutTenant(() =>
    Promise.all([
      User().findOne({ _id: payload.id, removed: false }).exec(),
      UserPassword().findOne({ user: payload.id, removed: false }).exec(),
    ])
  );
  if (!user || !passwordDoc?.totpEnabled || !user.enabled) {
    throw new HttpError(401, 'This sign-in step has expired. Enter your password again.');
  }

  const verified = verifyPresented(passwordDoc, req.body || {});
  if (!verified) {
    await record({
      req,
      action: 'login_failed',
      entity: 'auth',
      entityId: user._id,
      organizationId: user.organizationId,
      userId: user._id,
    });
    throw new HttpError(403, 'That code is not valid.');
  }

  if (verified.usedRecovery) {
    await UserPassword().updateOne({ _id: passwordDoc._id }, { $set: { recoveryCodes: verified.recoveryCodes } }).exec();
  }

  const { token } = await createSession({ user, req, res, remember: Boolean(req.body?.remember) });
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
    passwordDoc,
    token,
    remember: Boolean(req.body?.remember),
    message: 'Successfully login user',
  });
};

/** POST /api/auth/2fa/setup — starts enrollment. The secret is stored, but 2FA stays off until confirmed. */
exports.setup = async (req, res) => {
  const passwordDoc = await UserPassword().findOne({ user: req.admin._id, removed: false }).exec();
  if (!passwordDoc) throw new HttpError(404, 'User not found');
  if (passwordDoc.totpEnabled) throw new HttpError(409, 'Two-factor authentication is already on.');

  const secret = generateSecret();
  const otpauth = keyuri(req.admin.email, secret);
  await UserPassword().updateOne({ _id: passwordDoc._id }, { $set: { totpPendingSecret: encrypt(secret) } }).exec();
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });

  return res.status(200).json({
    success: true,
    result: { qrDataUrl, secret, otpauth },
    message: 'Scan the code, then enter a 6-digit code to confirm.',
  });
};

/** POST /api/auth/2fa/confirm { code } — turns 2FA on and returns 10 recovery codes, once. */
exports.confirm = async (req, res) => {
  const passwordDoc = await UserPassword().findOne({ user: req.admin._id, removed: false }).exec();
  if (!passwordDoc?.totpPendingSecret) {
    throw new HttpError(400, 'Start setup again, then enter the code from your app.');
  }
  let secret;
  try {
    secret = decrypt(passwordDoc.totpPendingSecret);
  } catch {
    throw new HttpError(400, 'Start setup again, then enter the code from your app.');
  }
  if (!verifyTotp(req.body?.code, secret)) throw new HttpError(403, 'That code is not valid.');

  const codes = generateRecoveryCodes();
  await UserPassword()
    .updateOne(
      { _id: passwordDoc._id },
      {
        $set: {
          totpEnabled: true,
          totpSecret: passwordDoc.totpPendingSecret,
          recoveryCodes: codes.map((code) => ({ hash: hashCode(code), used: false })),
        },
        $unset: { totpPendingSecret: 1 },
      }
    )
    .exec();

  return res.status(200).json({
    success: true,
    result: { recoveryCodes: codes, twoFactorEnabled: true },
    message: 'Two-factor authentication is on. Save these recovery codes; they are shown once.',
  });
};

/** POST /api/auth/2fa/disable { password, code? , recoveryCode? } */
exports.disable = async (req, res) => {
  const passwordDoc = await UserPassword().findOne({ user: req.admin._id, removed: false }).exec();
  if (!passwordDoc?.totpEnabled) throw new HttpError(400, 'Two-factor authentication is already off.');

  const org = await mongoose.model('Organization').findById(req.admin.organizationId).select('requireTwoFactor').lean();
  if (org?.requireTwoFactor) {
    throw new HttpError(403, 'Your organization requires two-factor authentication.');
  }

  const passwordOk = await bcrypt.compare(passwordDoc.salt + (req.body?.password || ''), passwordDoc.password);
  if (!passwordOk) throw new HttpError(403, 'The password is wrong.');

  const verified = verifyPresented(passwordDoc, req.body || {});
  if (!verified) throw new HttpError(403, 'That code is not valid.');

  await UserPassword()
    .updateOne(
      { _id: passwordDoc._id },
      { $set: { totpEnabled: false, recoveryCodes: [] }, $unset: { totpSecret: 1, totpPendingSecret: 1 } }
    )
    .exec();

  return res.status(200).json({
    success: true,
    result: { twoFactorEnabled: false },
    message: 'Two-factor authentication is off.',
  });
};
