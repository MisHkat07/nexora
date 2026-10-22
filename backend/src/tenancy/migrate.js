const crypto = require('crypto');
const mongoose = require('mongoose');
const { slugify } = require('transliteration');

/** All models that belong to an organization (they carry the tenant plugin's field). */
const tenantModels = () =>
  Object.values(mongoose.models).filter((Model) => Model.schema.path('organizationId'));

const uniqueSlug = (name) =>
  `${slugify(name || 'company').slice(0, 40) || 'company'}-${crypto.randomBytes(3).toString('hex')}`;

/**
 * Moves data created before multi-tenancy into an organization.
 * Creates a default organization from the company settings if none exists, then assigns
 * every document without organizationId to it. Safe to run any number of times.
 * Uses the raw collections, so it runs outside tenant scoping on purpose.
 */
const ensureTenancy = async ({ logger = console } = {}) => {
  const missing = { organizationId: { $exists: false } };

  const pending = await Promise.all(
    tenantModels().map(async (Model) => [Model, await Model.collection.countDocuments(missing)])
  );
  const toMigrate = pending.filter(([, count]) => count > 0);
  if (toMigrate.length === 0) return { organizationId: null, migrated: {} };

  const Organization = mongoose.model('Organization');
  let organization = await Organization.findOne().sort({ created: 1 }).exec();
  if (!organization) {
    const companyName =
      (await mongoose.model('Setting').collection.findOne({ settingKey: 'company_name' }))?.settingValue ||
      'My Company';
    const owner = await mongoose.model('Admin').collection.findOne({}, { sort: { created: 1 } });
    organization = await Organization.create({
      name: companyName,
      slug: uniqueSlug(companyName),
      owner: owner?._id,
    });
    logger.info?.(`Created organization "${organization.name}" for existing data`);
  }

  const migrated = {};
  for (const [Model] of toMigrate) {
    const { modifiedCount } = await Model.collection.updateMany(missing, {
      $set: { organizationId: organization._id },
    });
    migrated[Model.modelName] = modifiedCount;
  }
  logger.info?.({ migrated }, `Assigned existing records to organization "${organization.name}"`);

  return { organizationId: organization._id, migrated };
};

module.exports = { ensureTenancy, tenantModels };
