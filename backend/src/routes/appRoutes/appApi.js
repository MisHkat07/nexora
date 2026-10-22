const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');
const { DOWNLOADABLE_ENTITIES, signDownloadUrl } = require('@/utils/downloadToken');
const authorize = require('@/auth/authorize');

const mongoose = require('mongoose');

// Returns a short-lived link the browser can open to download the document's PDF
const downloadLink = (modelName, entity) => async (req, res) => {
  const exists = await mongoose.model(modelName).exists({ _id: req.params.id, removed: false });
  if (!exists) {
    return res.status(404).json({ success: false, result: null, message: 'No document found ' });
  }
  return res.status(200).json({
    success: true,
    result: { url: signDownloadUrl(entity, req.params.id) },
    message: 'Download link created',
  });
};

const routerApp = (entity, controller, modelName) => {
  // Every route checks the user's role first (see src/auth/permissions.js)
  const can = (action) => authorize(`${entity}:${action}`);

  router.route(`/${entity}/create`).post(can('create'), catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(can('read'), catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(can('update'), catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(can('delete'), catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(can('read'), catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(can('read'), catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(can('read'), catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(can('read'), catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(can('read'), catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(can('mail'), catchErrors(controller['mail']));
  }

  if (DOWNLOADABLE_ENTITIES.includes(entity)) {
    router
      .route(`/${entity}/download-link/:id`)
      .get(can('read'), catchErrors(downloadLink(modelName, entity)));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).post(can('convert'), catchErrors(controller['convert']));
  }
};

routesList.forEach(({ entity, controllerName, modelName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller, modelName);
});

module.exports = router;
