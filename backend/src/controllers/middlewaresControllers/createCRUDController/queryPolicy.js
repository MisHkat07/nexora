const Joi = require('joi');
const mongoose = require('mongoose');
const { escapeRegExp } = require('lodash');

const HttpError = require('@/handlers/httpError');

const objectId = Joi.string().hex().length(24);

/*
  What API clients may do with each model.

  - body:       Joi schema for the generic create/update (null = not writable through the generic CRUD)
  - filterable: fields usable as ?filter=<field>&equal=<value>
  - searchable: string fields usable in ?fields=a,b&q=text
  - sortable:   fields usable in ?sortBy=

  Every model served by createCRUDController must have an entry here.
*/
const policies = {
  Client: {
    body: Joi.object({
      name: Joi.string().trim().max(200).required(),
      phone: Joi.string().allow('').max(50),
      country: Joi.string().allow('').max(100),
      address: Joi.string().allow('').max(500),
      email: Joi.string().allow('').max(254),
      enabled: Joi.boolean(),
      assigned: objectId.allow(null),
      remindersOff: Joi.boolean(),
      tags: Joi.array().items(objectId).max(20),
      custom: Joi.object().pattern(/^[a-z0-9_ ]{1,40}$/i, Joi.string().allow('').max(200)).max(30),
    }),
    filterable: ['_id', 'enabled', 'country', 'assigned', 'email'],
    searchable: ['name', 'email', 'phone', 'country'],
    sortable: ['created', 'updated', 'enabled', 'name', 'country'],
  },
  Invoice: {
    body: null,
    filterable: ['_id', 'client', 'status', 'paymentStatus', 'year', 'number', 'currency', 'isOverdue'],
    searchable: ['notes', 'status', 'paymentStatus'],
    sortable: ['created', 'updated', 'enabled', 'date', 'expiredDate', 'number', 'total', 'status'],
  },
  Quote: {
    body: null,
    filterable: ['_id', 'client', 'status', 'year', 'number', 'currency', 'converted'],
    searchable: ['notes', 'status'],
    sortable: ['created', 'updated', 'enabled', 'date', 'expiredDate', 'number', 'total', 'status'],
  },
  Payment: {
    body: null,
    filterable: ['_id', 'client', 'invoice', 'paymentMode', 'number', 'currency'],
    searchable: ['ref', 'description'],
    sortable: ['created', 'updated', 'enabled', 'date', 'number', 'amount'],
  },
  PaymentMode: {
    body: Joi.object({
      name: Joi.string().trim().max(100).required(),
      description: Joi.string().allow('').max(500).required(),
      ref: Joi.string().allow('').max(100),
      isDefault: Joi.boolean(),
      enabled: Joi.boolean(),
    }),
    filterable: ['_id', 'enabled', 'isDefault'],
    searchable: ['name', 'description'],
    sortable: ['created', 'enabled', 'name', 'isDefault'],
  },
  Taxes: {
    body: Joi.object({
      taxName: Joi.string().trim().max(100).required(),
      taxValue: Joi.number().min(0).max(100).required(),
      isDefault: Joi.boolean(),
      enabled: Joi.boolean(),
    }),
    filterable: ['_id', 'enabled', 'isDefault'],
    searchable: ['taxName'],
    sortable: ['created', 'enabled', 'taxName', 'taxValue', 'isDefault'],
  },
  Setting: {
    body: Joi.object({
      settingCategory: Joi.string().max(100).required(),
      settingKey: Joi.string().max(100).required(),
      settingValue: Joi.any(),
      valueType: Joi.string().max(50),
      isPrivate: Joi.boolean(),
      enabled: Joi.boolean(),
    }),
    filterable: ['_id', 'settingCategory', 'settingKey', 'enabled'],
    searchable: ['settingKey', 'settingCategory'],
    sortable: ['settingKey', 'settingCategory', 'enabled'],
  },
  Contact: {
    body: Joi.object({
      name: Joi.string().trim().max(200).required(),
      title: Joi.string().allow('').max(100),
      email: Joi.string().allow('').max(254),
      phone: Joi.string().allow('').max(50),
      client: objectId.required(),
      isPrimary: Joi.boolean(),
      notes: Joi.string().allow('').max(2000),
    }),
    filterable: ['_id', 'client', 'isPrimary', 'email'],
    searchable: ['name', 'email', 'phone', 'title'],
    sortable: ['created', 'name', 'email'],
  },
  Lead: {
    body: Joi.object({
      name: Joi.string().trim().max(200).required(),
      email: Joi.string().allow('').max(254),
      phone: Joi.string().allow('').max(50),
      source: Joi.string().allow('').max(100),
      status: Joi.string().valid('new', 'contacted', 'qualified', 'lost', 'converted'),
      owner: objectId,
      notes: Joi.string().allow('').max(2000),
    }),
    filterable: ['_id', 'status', 'owner', 'source'],
    searchable: ['name', 'email', 'source'],
    sortable: ['created', 'name', 'status'],
  },
  Deal: {
    body: Joi.object({
      title: Joi.string().trim().max(200).required(),
      client: objectId,
      lead: objectId,
      value: Joi.number().min(0),
      currency: Joi.string().max(8),
      stage: Joi.string().max(80),
      probability: Joi.number().min(0).max(100),
      expectedClose: Joi.date(),
      owner: objectId,
      lostReason: Joi.string().allow('').max(500),
      quote: objectId,
    }),
    filterable: ['_id', 'stage', 'client', 'owner'],
    searchable: ['title', 'stage'],
    sortable: ['created', 'value', 'expectedClose', 'stage', 'title'],
  },
  Activity: {
    body: Joi.object({
      type: Joi.string().valid('note', 'call', 'email', 'meeting', 'task'),
      summary: Joi.string().trim().max(2000).required(),
      dueAt: Joi.date(),
      done: Joi.boolean(),
      client: objectId,
      deal: objectId,
      lead: objectId,
      owner: objectId,
    }),
    filterable: ['_id', 'type', 'client', 'deal', 'lead', 'done'],
    searchable: ['summary'],
    sortable: ['created', 'dueAt', 'type'],
  },
  Tag: {
    body: Joi.object({
      name: Joi.string().trim().max(80).required(),
      color: Joi.string().max(20),
    }),
    filterable: ['_id', 'name'],
    searchable: ['name'],
    sortable: ['created', 'name'],
  },
  Product: {
    body: Joi.object({
      sku: Joi.string().allow('').max(80),
      name: Joi.string().trim().max(200).required(),
      description: Joi.string().allow('').max(2000),
      type: Joi.string().valid('product', 'service'),
      unit: Joi.string().max(40),
      price: Joi.number().min(0),
      cost: Joi.number().min(0),
      taxRate: Joi.number().min(0),
      category: Joi.string().allow('').max(80),
      quantity: Joi.number(),
      enabled: Joi.boolean(),
    }),
    filterable: ['_id', 'type', 'category', 'enabled', 'sku'],
    searchable: ['name', 'sku', 'category'],
    sortable: ['created', 'name', 'price', 'sku'],
  },
  StockMovement: {
    body: Joi.object({
      product: objectId.required(),
      warehouse: Joi.string().allow('').max(120),
      quantity: Joi.number().required(),
      type: Joi.string().valid('in', 'out', 'adjust'),
      note: Joi.string().allow('').max(500),
    }),
    filterable: ['_id', 'product', 'type', 'warehouse'],
    searchable: ['note', 'warehouse'],
    sortable: ['created', 'quantity'],
  },
  Warehouse: {
    body: Joi.object({
      name: Joi.string().trim().max(120).required(),
      address: Joi.string().allow('').max(300),
    }),
    filterable: ['_id', 'name'],
    searchable: ['name', 'address'],
    sortable: ['created', 'name'],
  },
  Vendor: {
    body: Joi.object({
      name: Joi.string().trim().max(200).required(),
      email: Joi.string().allow('').max(254),
      phone: Joi.string().allow('').max(50),
      address: Joi.string().allow('').max(300),
      enabled: Joi.boolean(),
    }),
    filterable: ['_id', 'enabled', 'email'],
    searchable: ['name', 'email'],
    sortable: ['created', 'name'],
  },
  Expense: {
    body: Joi.object({
      vendor: objectId,
      amount: Joi.number().required(),
      currency: Joi.string().max(8),
      date: Joi.date(),
      category: Joi.string().allow('').max(80),
      notes: Joi.string().allow('').max(2000),
    }),
    filterable: ['_id', 'vendor', 'category', 'currency'],
    searchable: ['category', 'notes'],
    sortable: ['created', 'date', 'amount'],
  },
  PurchaseOrder: {
    body: Joi.object({
      vendor: objectId.required(),
      number: Joi.number(),
      status: Joi.string().valid('draft', 'sent', 'received', 'cancelled'),
      items: Joi.array().items(Joi.object({ itemName: Joi.string(), quantity: Joi.number(), price: Joi.number(), total: Joi.number() })),
      total: Joi.number(),
      date: Joi.date(),
      notes: Joi.string().allow('').max(2000),
    }),
    filterable: ['_id', 'vendor', 'status'],
    searchable: ['notes', 'status'],
    sortable: ['created', 'date', 'total', 'number'],
  },
  CreditNote: {
    body: Joi.object({
      invoice: objectId.required(),
      number: Joi.number(),
      amount: Joi.number().greater(0).required(),
      reason: Joi.string().allow('').max(2000),
      status: Joi.string().valid('issued', 'applied', 'refunded'),
    }),
    filterable: ['_id', 'invoice', 'status'],
    searchable: ['reason'],
    sortable: ['created', 'amount', 'number'],
  },
  RecurringProfile: {
    body: null,
    filterable: ['_id', 'status', 'frequency', 'sourceInvoice'],
    searchable: ['frequency', 'status'],
    sortable: ['created', 'nextRunAt', 'status'],
  },
  ExchangeRate: {
    body: Joi.object({
      code: Joi.string().max(8).required(),
      rate: Joi.number().greater(0).required(),
      date: Joi.date(),
    }),
    filterable: ['_id', 'code'],
    searchable: ['code'],
    sortable: ['created', 'date', 'code'],
  },
  Notification: {
    body: Joi.object({
      title: Joi.string().max(200).required(),
      body: Joi.string().allow('').max(2000),
      read: Joi.boolean(),
      link: Joi.string().allow('').max(300),
      user: objectId,
    }),
    filterable: ['_id', 'read', 'user'],
    searchable: ['title', 'body'],
    sortable: ['created', 'read'],
  },
};

// Never accepted from a request body, whatever the model
const PROTECTED_FIELDS = ['_id', '__v', 'removed', 'createdBy', 'created', 'updated', 'organizationId'];

const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

const getPolicy = (modelName) => {
  const policy = policies[modelName];
  if (!policy) throw new Error(`No query policy defined for model ${modelName}`);
  return policy;
};

/** Validates a create/update body. Protected fields are dropped, unknown fields are rejected. */
const validateBody = (modelName, body = {}, { partial = false } = {}) => {
  const { body: schema } = getPolicy(modelName);
  if (!schema) throw new HttpError(405, 'This resource cannot be written through this endpoint');

  const input = { ...body };
  for (const field of PROTECTED_FIELDS) delete input[field];

  const { error, value } = (partial ? optionalKeys(schema) : schema).validate(input);
  if (error) throw new HttpError(400, error.details[0].message);
  return value;
};

// Updates may send any subset of the fields
const optionalKeys = (schema) => {
  const { keys = {} } = schema.describe();
  const required = Object.keys(keys).filter((key) => keys[key].flags?.presence === 'required');
  return required.length ? schema.fork(required, (field) => field.optional()) : schema;
};

const asString = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `Invalid "${name}" parameter`);
  return value;
};

/** `?filter=field&equal=value` → a safe Mongo condition. */
const buildFilter = (modelName, query) => {
  const filter = asString(query.filter, 'filter');
  const equal = asString(query.equal, 'equal');
  if (filter === undefined || filter === '') return {};
  if (!getPolicy(modelName).filterable.includes(filter)) {
    throw new HttpError(400, `Filtering on "${filter}" is not allowed`);
  }
  if (equal === undefined) throw new HttpError(400, 'filter not provided correctly');

  const Model = mongoose.model(modelName);
  const path = Model.schema.path(filter);
  if (path?.instance === 'ObjectId' && !mongoose.isValidObjectId(equal)) {
    throw new HttpError(400, `Invalid value for "${filter}"`);
  }
  return { [filter]: equal };
};

/** `?fields=a,b&q=text` → a case-insensitive "contains" match on allowed fields. */
const buildSearch = (modelName, query, { defaultFields } = {}) => {
  const q = asString(query.q, 'q') ?? '';
  const fieldsParam = asString(query.fields, 'fields');
  const { searchable } = getPolicy(modelName);

  const fields = fieldsParam
    ? fieldsParam.split(',').map((field) => field.trim()).filter(Boolean)
    : defaultFields || [];
  if (fields.length === 0) return {};

  const notAllowed = fields.filter((field) => !searchable.includes(field));
  if (notAllowed.length > 0) {
    throw new HttpError(400, `Searching on "${notAllowed.join(', ')}" is not allowed`);
  }

  const pattern = new RegExp(escapeRegExp(q.slice(0, MAX_SEARCH_LENGTH)), 'i');
  return { $or: fields.map((field) => ({ [field]: { $regex: pattern } })) };
};

const buildSort = (modelName, query, defaultSortBy = 'enabled') => {
  const sortBy = asString(query.sortBy, 'sortBy') || defaultSortBy;
  if (!getPolicy(modelName).sortable.includes(sortBy) && sortBy !== defaultSortBy) {
    throw new HttpError(400, `Sorting on "${sortBy}" is not allowed`);
  }
  const raw = asString(query.sortValue, 'sortValue') ?? '-1';
  const direction = ['1', 'asc'].includes(raw) ? 1 : ['-1', 'desc'].includes(raw) ? -1 : null;
  if (direction === null) throw new HttpError(400, 'Invalid "sortValue" parameter');
  return { [sortBy]: direction };
};

const buildPagination = (query) => {
  const page = Math.max(parseInt(asString(query.page, 'page'), 10) || 1, 1);
  const requested = parseInt(asString(query.items, 'items'), 10) || 10;
  const limit = Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
};

/** Everything a paginated list endpoint needs, validated. */
const buildListQuery = (modelName, query) => ({
  conditions: { removed: false, ...buildFilter(modelName, query), ...buildSearch(modelName, query) },
  sort: buildSort(modelName, query),
  ...buildPagination(query),
});

module.exports = {
  policies,
  getPolicy,
  validateBody,
  buildFilter,
  buildSearch,
  buildSort,
  buildPagination,
  buildListQuery,
  MAX_PAGE_SIZE,
};
