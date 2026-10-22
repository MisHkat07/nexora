const downloadPdf = require('@/handlers/downloadHandler/downloadPdf');
const express = require('express');

const { DOWNLOADABLE_ENTITIES, verifyDownloadToken } = require('@/utils/downloadToken');

const router = express.Router();

const notFound = (res) =>
  res.status(404).json({ success: false, result: null, message: 'File not found' });

// GET /download/invoice/invoice-<id>.pdf?token=<signed download token>
router.route('/:directory/:file').get(function (req, res) {
  const { directory, file } = req.params;

  if (!DOWNLOADABLE_ENTITIES.includes(directory)) return notFound(res);

  const match = file.match(new RegExp(`^${directory}-([a-f0-9]{24})\\.pdf$`));
  if (!match) return notFound(res);
  const id = match[1];

  const { token } = req.query;
  if (typeof token !== 'string' || !verifyDownloadToken(token, directory, id)) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'This download link is invalid or has expired.',
    });
  }

  return downloadPdf(req, res, { directory, id });
});

module.exports = router;
