const fs = require('fs/promises');
const path = require('path');

const { contentTypeFor } = require('./contentTypes');

// Files live under backend/src/<key>, i.e. backend/src/public/uploads/...
const ROOT = path.resolve('src');

const resolveKey = (key) => {
  const absolutePath = path.resolve(ROOT, key);
  if (!absolutePath.startsWith(path.join(ROOT, 'public') + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return absolutePath;
};

module.exports = () => ({
  async put(key, body) {
    const absolutePath = resolveKey(key);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, body);
  },

  async get(key) {
    try {
      const body = await fs.readFile(resolveKey(key));
      return { body, contentType: contentTypeFor(key) };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  },

  async remove(key) {
    await fs.rm(resolveKey(key), { force: true });
  },
});
