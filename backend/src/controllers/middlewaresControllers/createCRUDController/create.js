const { validateBody } = require('./queryPolicy');

const create = async (Model, req, res) => {
  const body = validateBody(Model.modelName, req.body);

  // Creating a new document in the collection
  const result = await new Model({
    ...body,
    removed: false,
    createdBy: req.admin?._id,
  }).save();

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
