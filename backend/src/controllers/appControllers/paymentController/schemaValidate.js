const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const fields = {
  number: Joi.number().required(),
  date: Joi.date().required(),
  amount: Joi.number().greater(0).required().messages({
    'number.greater': "The Minimum Amount couldn't be 0",
  }),
  paymentMode: objectId.allow(null, ''),
  ref: Joi.string().allow('').max(200),
  description: Joi.string().allow('').max(2000),
};

// The client always comes from the invoice, never from the request
const create = Joi.object({
  ...fields,
  invoice: objectId.required(),
  client: Joi.any().strip(),
});

// A payment can't be moved to another invoice
const update = Joi.object({
  ...fields,
  invoice: Joi.any().strip(),
  client: Joi.any().strip(),
});

module.exports = { create, update };
