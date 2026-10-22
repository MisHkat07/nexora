const listAll = async (Model, req, res) => {
  const sort = req.query.sort === 'asc' ? 1 : -1;
  const conditions = { removed: false };
  if (req.query.enabled === 'true' || req.query.enabled === 'false') {
    conditions.enabled = req.query.enabled === 'true';
  }

  //  Query the database for a list of all results
  const result = await Model.find(conditions).sort({ created: sort }).exec();

  if (result.length > 0) {
    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = listAll;
