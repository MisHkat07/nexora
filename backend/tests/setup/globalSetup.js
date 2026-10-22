const { MongoMemoryReplSet } = require('mongodb-memory-server');

// A single-node replica set, so tests can use MongoDB transactions
module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  globalThis.__MONGO_REPLSET__ = replSet;
  process.env.MONGO_TEST_URI = replSet.getUri();
};
