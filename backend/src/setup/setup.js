/*
  Seeds a fresh database with one organization, its owner, default settings, tax and payment mode.

  Real install:  SETUP_ADMIN_EMAIL=you@company.com SETUP_ADMIN_PASSWORD=... SETUP_COMPANY_NAME="Acme Ltd" npm run setup
  Demo install:  npm run setup   (admin@demo.com / admin123)
*/
require('module-alias/register');
const path = require('path');
const mongoose = require('mongoose');
const { globSync } = require('glob');

const config = require('@/config');

const adminEmail = (process.env.SETUP_ADMIN_EMAIL || 'admin@demo.com').toLowerCase();
const adminPassword = process.env.SETUP_ADMIN_PASSWORD || 'admin123';
const companyName = process.env.SETUP_COMPANY_NAME || 'My Company';

async function setupApp() {
  try {
    await mongoose.connect(config.database);
    for (const file of globSync('./src/models/**/*.js')) require(path.resolve(file));
    const { createOrganization } = require('@/tenancy/createOrganization');

    if (await mongoose.model('Admin').exists({ email: adminEmail })) {
      console.log(`🚫 An account for ${adminEmail} already exists. Nothing was changed.`);
      process.exit(1);
    }

    const { organization } = await createOrganization({
      name: companyName,
      owner: { email: adminEmail, name: process.env.SETUP_ADMIN_NAME || 'Admin', password: adminPassword },
    });

    console.log(`👍 Organization "${organization.name}" created`);
    console.log(`👍 Admin created. Login: ${adminEmail}`);
    if (!process.env.SETUP_ADMIN_PASSWORD) {
      console.log('⚠️  Using the demo password "admin123". Change it in Profile after logging in.');
    }
    console.log('🥳 Setup completed :Success!');
    process.exit(0);
  } catch (e) {
    console.log('\n🚫 Error! The Error info is below');
    console.log(e);
    process.exit(1);
  }
}

setupApp();
