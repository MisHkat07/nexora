const express = require('express');
const router = express.Router();

const storage = require('@/storage');
const { catchErrors } = require('@/handlers/errorHandlers');

const notFound = (res) =>
  res.status(404).json({ success: false, result: null, message: 'File not found' });

// GET /public/uploads/<entity>/<file> — uploaded images, from local disk or the S3 bucket
router.route('/uploads/:directory/:file').get(
  catchErrors(async (req, res) => {
    const key = `public/uploads/${req.params.directory}/${req.params.file}`;
    if (!storage.isValidKey(key)) return notFound(res);

    const file = await storage.get(key);
    if (!file) return notFound(res);

    // Only images are ever served inline; anything else is a download
    const isImage = file.contentType.startsWith('image/') && file.contentType !== 'image/svg+xml';
    res.set({
      'Content-Type': isImage ? file.contentType : 'application/octet-stream',
      'Content-Disposition': isImage ? 'inline' : 'attachment',
      // File names are unique, so they can be cached for a long time
      'Cache-Control': 'public, max-age=86400',
    });
    return res.send(file.body);
  })
);

module.exports = router;
