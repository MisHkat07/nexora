const { buildSearch, getPolicy } = require('./queryPolicy');

const search = async (Model, req, res) => {
  const conditions = buildSearch(Model.modelName, req.query, {
    defaultFields: [getPolicy(Model.modelName).searchable[0]],
  });

  let results = await Model.find({
    ...conditions,
  })
    .where('removed', false)
    .limit(20)
    .exec();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
