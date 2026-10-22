const { buildFilter } = require('./queryPolicy');

const summary = async (Model, req, res) => {
  //  Count all documents, and those matching the optional filter
  const countAllPromise = Model.countDocuments({ removed: false });
  const countFilterPromise = Model.countDocuments({
    removed: false,
    ...buildFilter(Model.modelName, req.query),
  });
  const [countFilter, countAllDocs] = await Promise.all([countFilterPromise, countAllPromise]);

  if (countAllDocs > 0) {
    return res.status(200).json({
      success: true,
      result: { countFilter, countAllDocs },
      message: 'Successfully count all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = summary;
