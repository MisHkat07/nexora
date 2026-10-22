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

    const fileId = directory + '-' + result._id + '.pdf';
    const targetLocation = `src/public/download/${directory}/${fileId}`;
    await custom.generatePdf(
      modelName,
      { filename: directory, format: 'A4', targetLocation },
      result,
      async () => {
        return res.download(targetLocation, (error) => {
          if (error) sendError(error, req, res);
        });
      }
    );
  } catch (error) {
    return sendError(error, req, res);
  }
};

module.exports = downloadPdf;
