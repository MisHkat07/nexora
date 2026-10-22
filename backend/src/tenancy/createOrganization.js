const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { slugify } = require('transliteration');

const DEFAULT_SETTINGS_DIR = path.join(__dirname, '../setup/defaultSettings');

const defaultSettings = () =>
  fs
    .readdirSync(DEFAULT_SETTINGS_DIR)
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => JSON.parse(fs.readFileSync(path.join(DEFAULT_SETTINGS_DIR, file), 'utf-8')));

/**
 * Creates an organization with its owner account and default settings, tax and payment mode.
 * Used by `npm run setup` (and by self-serve signup, #17). Runs outside tenant scoping, so
 * every document is given its organizationId explicitly. Pass a session to run it in a transaction.
 */
const createOrganization = async ({ name, owner, country, emailVerified = true, session }) => {
  const Organization = mongoose.model('Organization');
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');

  const [organization] = await Organization.create(
    [{ name, slug: `${slugify(name).slice(0, 40) || 'company'}-${crypto.randomBytes(3).toString('hex')}` }],
    { session }
  );
  const organizationId = organization._id;

  const [admin] = await Admin.create(
    [
      {
        organizationId,
        email: owner.email.toLowerCase(),
        name: owner.name || 'Admin',
        surname: owner.surname || '',
        enabled: true,
        role: 'owner',
      },
    ],
    { session }
  );

  const passwordDoc = new AdminPassword();
  const salt = crypto.randomUUID();
  passwordDoc.set({
    user: admin._id,
    salt,
    password: passwordDoc.generateHash(salt, owner.password),
    emailVerified,
  });
  await passwordDoc.save({ session });

  organization.owner = admin._id;
  await organization.save({ session });

  const companyDefaults = {
    company_name: name,
    company_email: owner.email.toLowerCase(),
    ...(country && { company_country: country }),
  };
  await mongoose.model('Setting').insertMany(
    defaultSettings().map((setting) => ({
      ...setting,
      ...(setting.settingKey in companyDefaults && { settingValue: companyDefaults[setting.settingKey] }),
      organizationId,
    })),
    { session }
  );
  await mongoose.model('Taxes').create([{ organizationId, taxName: 'Tax 0%', taxValue: 0, isDefault: true }], { session });
  await mongoose.model('PaymentMode').create(
    [
      {
        organizationId,
        name: 'Default Payment',
        description: 'Default Payment Mode (Cash , Wire Transfert)',
        isDefault: true,
      },
    ],
    { session }
  );

  return { organization, admin };
};

module.exports = { createOrganization, defaultSettings };
