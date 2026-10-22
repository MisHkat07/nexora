/*
  Deletes ALL organizations, users, settings, taxes and payment modes (every tenant).
  For local development only: refuses to run when NODE_ENV=production.
*/
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

if (process.env.NODE_ENV === 'production') {
  console.error('🚫 npm run reset deletes every organization and is disabled in production.');
  process.exit(1);
}

async function deleteData() {
  await mongoose.connect(process.env.DATABASE);
  const collections = ['organizations', 'admins', 'adminpasswords', 'settings', 'paymentmodes', 'taxes'];
  for (const name of collections) {
    await mongoose.connection.db.collection(name).deleteMany({});
  }
  console.log(`👍 Deleted: ${collections.join(', ')}. To start again, run\n\n\t npm run setup\n`);
  process.exit(0);
}

deleteData().catch((error) => {
  console.error(error);
  process.exit(1);
});
