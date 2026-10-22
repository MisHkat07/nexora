/*
  Assigns data created before multi-tenancy to an organization (see src/tenancy/migrate.js).
  The server also does this automatically on startup; this script runs it on demand:
    npm run migrate:tenancy
*/
require('module-alias/register');
const path = require('path');
const mongoose = require('mongoose');
const { globSync } = require('glob');

const config = require('@/config');
const { ensureTenancy } = require('@/tenancy/migrate');

const main = async () => {
  await mongoose.connect(config.database);
  for (const file of globSync('./src/models/**/*.js')) require(path.resolve(file));

  const { organizationId, migrated } = await ensureTenancy({ logger: console });
  console.log(
    organizationId ? `Done: ${JSON.stringify(migrated)}` : 'Nothing to migrate: every record has an organization.'
  );
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
