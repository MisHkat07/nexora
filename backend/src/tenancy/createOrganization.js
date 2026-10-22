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
 * every document is given its organizationId explicitly.
 */
const createOrganization = async ({ name, owner }) => {
  const Organization = mongoose.model('Organization');
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');

  const organization = await Organization.create({
    name,
    slug: `${slugify(name).slice(0, 40) || 'company'}-${crypto.randomBytes(3).toString('hex')}`,
  });
  const organizationId = organization._id;

  const admin = await Admin.create({
    organizationId,
    email: owner.email.toLowerCase(),
    name: owner.name || 'Admin',
    surname: owner.surname || '',
    enabled: true,
    role: 'owner',
  });

  const passwordDoc = new AdminPassword();
  const salt = crypto.randomUUID();
  passwordDoc.set({
    user: admin._id,
    salt,
    password: passwordDoc.generateHash(salt, owner.password),
    emailVerified: true,
  });
  await passwordDoc.save();

  organization.owner = admin._id;
  await organization.save();

  const companyDefaults = { company_name: name, company_email: owner.email.toLowerCase() };
  await mongoose.model('Setting').insertMany(
    defaultSettings().map((setting) => ({
      ...setting,
      ...(setting.settingKey in companyDefaults && { settingValue: companyDefaults[setting.settingKey] }),
      organizationId,
    }))
  );
  await mongoose.model('Taxes').create({ organizationId, taxName: 'Tax 0%', taxValue: 0, isDefault: true });
  await mongoose.model('PaymentMode').create({
    organizationId,
    name: 'Default Payment',
    description: 'Default Payment Mode (Cash , Wire Transfert)',
    isDefault: true,
  });

  return { organization, admin };
};

module.exports = { createOrganization, defaultSettings };
