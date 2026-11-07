require('module-alias/register');

const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

const config = require('./config');
const logger = require('./logger');
const { startWorker } = require('./jobs/queue');

const start = async () => {
  for (const filePath of globSync('./src/models/**/*.js')) require(path.resolve(filePath));
  require('./jobs/handlers');
  await mongoose.connect(config.database);
  logger.info('Job worker connected');
  startWorker();
};

start().catch((error) => {
  logger.fatal({ err: error }, 'Worker failed to start');
  process.exit(1);
});
