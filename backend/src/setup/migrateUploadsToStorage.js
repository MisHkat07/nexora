/*
  Copies files from backend/src/public/uploads into the configured storage driver.
  Run once after switching STORAGE_DRIVER to s3:   npm run storage:migrate

  Keys stay the same, so database references need no changes. Safe to re-run.
*/
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const config = require('@/config');
const storage = require('@/storage');
const { sniffImage } = require('@/storage/contentTypes');

const main = async () => {
  if (config.storage.driver !== 's3') {
    console.error('STORAGE_DRIVER is not "s3"; nothing to migrate.');
    process.exit(1);
  }

  const files = globSync('src/public/uploads/*/*', { nodir: true, posix: true });
  let copied = 0;
  let skipped = 0;

  for (const file of files) {
    const key = path.posix.relative('src', file);
    const body = fs.readFileSync(file);
    const detected = sniffImage(body);
    if (!storage.isValidKey(key) || !detected) {
      console.warn(`skip ${key} (not a supported image or invalid name)`);
      skipped++;
      continue;
    }
    await storage.put(key, body, detected.contentType);
    console.log(`copied ${key}`);
    copied++;
  }

  console.log(`Done: ${copied} copied, ${skipped} skipped.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
