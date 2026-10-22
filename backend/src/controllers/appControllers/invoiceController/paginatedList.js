const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const genericPaginatedList = require('@/controllers/middlewaresControllers/createCRUDController/paginatedList');

const paginatedList = (req, res) =>
  genericPaginatedList(Model, req, res, { populate: ['createdBy', 'name'] });

module.exports = paginatedList;
