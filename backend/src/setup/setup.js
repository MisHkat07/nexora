require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const crypto = require('crypto');

const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE);

// Override the demo login for real installs: SETUP_ADMIN_EMAIL=you@company.com SETUP_ADMIN_PASSWORD=... npm run setup
const adminEmail = (process.env.SETUP_ADMIN_EMAIL || 'admin@demo.com').toLowerCase();
const adminPassword = process.env.SETUP_ADMIN_PASSWORD || 'admin123';

async function setupApp() {
  try {
    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');
    const newAdminPassword = new AdminPassword();

    const salt = crypto.randomUUID();

    const passwordHash = newAdminPassword.generateHash(salt, adminPassword);

    const demoAdmin = {
      email: adminEmail,
      name: process.env.SETUP_ADMIN_NAME || 'Admin',
      surname: '',
      enabled: true,
      role: 'owner',
    };
    const result = await new Admin(demoAdmin).save();

    const AdminPasswordData = {
      password: passwordHash,
      emailVerified: true,
      salt: salt,
      user: result._id,
    };
    await new AdminPassword(AdminPasswordData).save();

    console.log(`👍 Admin created : Done! Login: ${adminEmail}`);
    if (!process.env.SETUP_ADMIN_PASSWORD) {
      console.log('⚠️  Using the demo password "admin123". Change it in Profile after logging in.');
    }

    const Setting = require('../models/coreModels/Setting');

    const settingFiles = [];

    const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');

    for (const filePath of settingsFiles) {
      const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      settingFiles.push(...file);
    }

    await Setting.insertMany(settingFiles);

    console.log('👍 Settings created : Done!');

    const PaymentMode = require('../models/appModels/PaymentMode');
    const Taxes = require('../models/appModels/Taxes');

    await Taxes.insertMany([{ taxName: 'Tax 0%', taxValue: '0', isDefault: true }]);
    console.log('👍 Taxes created : Done!');

    await PaymentMode.insertMany([
      {
        name: 'Default Payment',
        description: 'Default Payment Mode (Cash , Wire Transfert)',
        isDefault: true,
      },
    ]);
    console.log('👍 PaymentMode created : Done!');

    console.log('🥳 Setup completed :Success!');
    process.exit();
  } catch (e) {
    console.log('\n🚫 Error! The Error info is below');
    console.log(e);
    process.exit();
  }
}

setupApp();
