const { buildFilter } = require('./queryPolicy');

const filter = async (Model, req, res) => {
  if (req.query.filter === undefined || req.query.equal === undefined) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'filter not provided correctly',
    });
  }
  const result = await Model.find({
    removed: false,
    ...buildFilter(Model.modelName, req.query),
  }).exec();

  // Return success resposne
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully found all documents  ',
  });
};

module.exports = filter;
