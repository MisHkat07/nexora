const mongoose = require('mongoose');

const { scopeFor } = require('./context');

const QUERY_OPS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
];

// organizationId can only be set when a document is created, never changed
const stripTenantFromUpdate = (update) => {
  if (!update || typeof update !== 'object') return;
  delete update.organizationId;
  for (const operator of ['$set', '$unset', '$setOnInsert', '$rename']) {
    if (update[operator]) delete update[operator].organizationId;
  }
};

/**
 * Makes a model belong to an organization. Adds a required, indexed organizationId and
 * scopes every query, update, aggregation, bulk write and new document to the current
 * tenant (see ./context.js).
 */
const tenantScoped = (schema) => {
  schema.add({
    organizationId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
  });

  schema.pre(QUERY_OPS, function () {
    const scope = scopeFor(`${this.model.modelName}.${this.op}`);
    if (!scope.scoped) return;
    this.where({ organizationId: scope.organizationId });
    stripTenantFromUpdate(this.getUpdate?.());
  });

  // Without a filter, this would count every organization's documents
  schema.pre('estimatedDocumentCount', function () {
    if (scopeFor(`${this.model.modelName}.estimatedDocumentCount`).scoped) {
      throw new Error('estimatedDocumentCount is not tenant-aware; use countDocuments');
    }
  });

  schema.pre('aggregate', function () {
    const scope = scopeFor(`${this._model.modelName}.aggregate`);
    if (!scope.scoped) return;
    this.pipeline().unshift({
      $match: { organizationId: new mongoose.Types.ObjectId(scope.organizationId) },
    });
  });

  schema.pre('validate', function () {
    const scope = scopeFor(`${this.constructor.modelName}.save`);
    if (!scope.scoped) return; // outside requests organizationId must be given explicitly
    if (!this.organizationId) {
      this.organizationId = scope.organizationId;
    } else if (String(this.organizationId) !== scope.organizationId) {
      throw new Error('Cannot save a document that belongs to another organization');
    }
  });

  schema.pre('insertMany', function (next, docs) {
    const scope = scopeFor(`${this.modelName}.insertMany`);
    if (scope.scoped) {
      for (const doc of [].concat(docs)) doc.organizationId = scope.organizationId;
    }
    next();
  });

  schema.pre('bulkWrite', function (next, ops) {
    const scope = scopeFor(`${this.modelName}.bulkWrite`);
    if (scope.scoped) {
      for (const op of ops) {
        const [type] = Object.keys(op);
        const body = op[type];
        if (type === 'insertOne') {
          body.document.organizationId = scope.organizationId;
        } else {
          body.filter = { ...body.filter, organizationId: scope.organizationId };
          stripTenantFromUpdate(body.update);
        }
      }
    }
    next();
  });
};

module.exports = tenantScoped;
