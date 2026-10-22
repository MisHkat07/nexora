const config = require('@/config');

/*
  File storage for uploads (logos, avatars).

  Keys look like "public/uploads/<entity>/<name>.<ext>" — the same strings stored in the
  database and requested by the browser at /public/uploads/<entity>/<name>.<ext>, so
  switching drivers needs no data migration beyond copying the files.

  Interface (all async):
    put(key, buffer, contentType)
    get(key)    -> { body: Buffer, contentType } | null
    remove(key)
*/

const KEY_PATTERN = /^public\/uploads\/[a-z0-9_-]+\/[A-Za-z0-9._-]+$/;

const assertValidKey = (key) => {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key) || key.includes('..')) {
    const error = new Error(`Invalid storage key: ${key}`);
    error.code = 'INVALID_KEY';
    throw error;
  }
};

const createDriver = () =>
  config.storage.driver === 's3'
    ? require('./s3Storage')(config.storage.s3)
    : require('./localStorage')();

let driver;
const getDriver = () => (driver ??= createDriver());

module.exports = {
  isValidKey: (key) => {
    try {
      assertValidKey(key);
      return true;
    } catch (error) {
      return false;
    }
  },
  put: async (key, body, contentType) => {
    assertValidKey(key);
    return getDriver().put(key, body, contentType);
  },
  get: async (key) => {
    assertValidKey(key);
    return getDriver().get(key);
  },
  remove: async (key) => {
    assertValidKey(key);
    return getDriver().remove(key);
  },
  // Tests swap in a fresh driver after changing config
  _reset: () => {
    driver = undefined;
  },
};
