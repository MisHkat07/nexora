const path = require('path');

// Only raster images are accepted as uploads. SVG is deliberately excluded:
// it can carry scripts that would run on our origin.
const IMAGE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const contentTypeFor = (key) =>
  IMAGE_TYPES[path.extname(key).toLowerCase()] || 'application/octet-stream';

/** Detects the real image type from the file's first bytes, ignoring its name and declared type. */
const sniffImage = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  const hex = buffer.subarray(0, 12).toString('hex');
  if (hex.startsWith('89504e470d0a1a0a')) return { ext: '.png', contentType: 'image/png' };
  if (hex.startsWith('ffd8ff')) return { ext: '.jpg', contentType: 'image/jpeg' };
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) {
    return { ext: '.gif', contentType: 'image/gif' };
  }
  if (hex.startsWith('52494646') && buffer.subarray(8, 12).toString() === 'WEBP') {
    return { ext: '.webp', contentType: 'image/webp' };
  }
  return null;
};

module.exports = { IMAGE_TYPES, contentTypeFor, sniffImage };
