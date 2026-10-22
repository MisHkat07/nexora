const crypto = require('crypto');
const multer = require('multer');
const { slugify } = require('transliteration');

const config = require('@/config');
const storage = require('@/storage');
const HttpError = require('@/handlers/httpError');
const { sendError } = require('@/handlers/errorHandlers');
const { sniffImage } = require('@/storage/contentTypes');

const SUPPORTED_TYPES = ['image'];

/**
 * Accepts one uploaded file in the multipart field "file", checks it, stores it and sets
 * req.body[fieldName] to its storage key (e.g. "public/uploads/admin/jane-3f9a1c2b7d4e.png").
 *
 * req.body[fieldName] is only ever set from a real upload, so clients can't point it
 * at an arbitrary path or URL.
 */
const singleStorageUpload = ({ entity, fileType = 'image', fieldName = 'file' }) => {
  if (!SUPPORTED_TYPES.includes(fileType)) throw new Error(`Unsupported upload type: ${fileType}`);
  if (!/^[a-z0-9_-]+$/.test(entity)) throw new Error(`Invalid upload entity: ${entity}`);

  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxUploadBytes, files: 1 },
  }).single('file');

  return async function uploadMiddleware(req, res, next) {
    try {
      await new Promise((resolve, reject) => parse(req, res, (error) => (error ? reject(error) : resolve())));
    } catch (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const maxMb = (config.storage.maxUploadBytes / 1024 / 1024).toFixed(0);
        return sendError(new HttpError(413, `File is too large (max ${maxMb} MB)`), req, res);
      }
      return sendError(new HttpError(400, 'Invalid file upload'), req, res);
    }

    delete req.body[fieldName];
    if (!req.file) return next();

    try {
      const detected = sniffImage(req.file.buffer);
      if (!detected) throw new HttpError(400, 'Only PNG, JPEG, GIF or WebP images are allowed');

      const baseName =
        slugify(req.file.originalname.replace(/\.[^.]*$/, '').toLowerCase())
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 40) || 'file';
      const fileName = `${baseName}-${crypto.randomBytes(6).toString('hex')}${detected.ext}`;
      const key = `public/uploads/${entity}/${fileName}`;

      await storage.put(key, req.file.buffer, detected.contentType);

      req.upload = { fileName, fieldExt: detected.ext, entity, fieldName, fileType, filePath: key };
      req.body[fieldName] = key;
      return next();
    } catch (error) {
      return sendError(error, req, res);
    }
  };
};

module.exports = singleStorageUpload;
