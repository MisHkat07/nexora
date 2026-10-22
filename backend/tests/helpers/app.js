const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { globSync } = require('glob');

/**
 * Connects to a fresh database for the current test file, registers every
 * model and returns the Express app.
 */
async function createTestApp() {
  const dbName = `test_${crypto.randomUUID().replace(/-/g, '')}`;
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName });

  for (const filePath of globSync('./src/models/**/*.js')) {
    require(path.resolve(filePath));
  }
  // Indexes must exist before transactions touch the collections
  await Promise.all(Object.values(mongoose.models).map((Model) => Model.createCollection()));

  return require('@/app');
}

async function closeTestApp() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { createTestApp, closeTestApp };
