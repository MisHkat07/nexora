require('module-alias/register');

// Make sure we are running node 20+
const [major] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.log('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit(1);
}

// Loads .env and exits with a helpful message if required variables are missing
const config = require('./config');
// Error tracking must start before express and mongoose are loaded
const Sentry = require('./instrument');

const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');
const logger = require('./logger');

if (!config.database) {
  logger.fatal('DATABASE is not set. Add your MongoDB connection string to backend/.env');
  process.exit(1);
}

if (config.isProduction && config.storage.driver === 'local') {
  logger.warn(
    'STORAGE_DRIVER is "local": uploaded logos and photos are lost when the container is replaced. Configure an S3 bucket (see backend/.env.example).'
  );
}

mongoose.connect(config.database).catch((error) => {
  logger.fatal({ err: error }, 'Could not connect to MongoDB. Check DATABASE in backend/.env');
  process.exit(1);
});

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
});

const modelsFiles = globSync('./src/models/**/*.js');

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

// Start our app!
const app = require('./app');
app.set('port', config.port);
const server = app.listen(app.get('port'), () => {
  logger.info(`Express running → On PORT : ${server.address().port}`);
});

// Finish in-flight requests before exiting when the platform stops the container
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await require('@/controllers/pdfController').closeBrowser();
    await mongoose.disconnect();
    await Sentry.close(2000);
    process.exit(0);
  });
  // Don't hang forever on keep-alive connections
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
