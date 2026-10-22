const custom = require('@/controllers/pdfController');
const mongoose = require('mongoose');

const { sendError } = require('@/handlers/errorHandlers');

// Callers must check `directory` against DOWNLOADABLE_ENTITIES and authorise the request first
const downloadPdf = async (req, res, { directory, id }) => {
  try {
    const modelName = directory.slice(0, 1).toUpperCase() + directory.slice(1);
    const Model = mongoose.model(modelName);
    const result = await Model.findOne({ _id: id, removed: false }).exec();

    if (!result) {
      return res.status(404).json({ success: false, result: null, message: 'Document not found' });
    }

    // Rendered on demand and streamed back; nothing is written to disk
    const pdf = await custom.generatePdf(modelName, result);
    const fileName = `${directory}-${result._id}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'private, no-store',
    });
    return res.send(pdf);
  } catch (error) {
    return sendError(error, req, res);
  }
};

module.exports = downloadPdf;
