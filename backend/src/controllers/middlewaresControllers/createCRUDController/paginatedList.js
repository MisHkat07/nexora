const { buildListQuery } = require('./queryPolicy');

const paginatedList = async (Model, req, res, { populate } = {}) => {
  const { conditions, sort, page, limit, skip } = buildListQuery(Model.modelName, req.query);

  //  Query the database for a list of all results
  let resultsQuery = Model.find(conditions).skip(skip).limit(limit).sort(sort);
  if (populate) resultsQuery = resultsQuery.populate(...populate);
  const resultsPromise = resultsQuery.exec();

  // Counting the total documents
  const countPromise = Model.countDocuments(conditions);
  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;
