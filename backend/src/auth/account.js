const mongoose = require('mongoose');

/** Flags the frontend needs after login, refresh, signup and invite acceptance. */
const accountFlags = async (user, passwordDoc) => {
  const org = user?.organizationId
    ? await mongoose.model('Organization').findById(user.organizationId).select('requireTwoFactor').lean()
    : null;
  const twoFactorEnabled = Boolean(passwordDoc?.totpEnabled);
  return {
    twoFactorEnabled,
    mustEnrollTwoFactor: Boolean(org?.requireTwoFactor) && !twoFactorEnabled,
  };
};

module.exports = { accountFlags };
