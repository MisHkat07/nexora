const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');
const { DOWNLOADABLE_ENTITIES, signDownloadUrl } = require('@/utils/downloadToken');

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
  router.route(`/${entity}/create`).post(catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(catchErrors(controller['mail']));
  }

  if (DOWNLOADABLE_ENTITIES.includes(entity)) {
    router.route(`/${entity}/download-link/:id`).get(catchErrors(downloadLink(modelName, entity)));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(catchErrors(controller['convert']));
  }
};

routesList.forEach(({ entity, controllerName, modelName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller, modelName);
});

module.exports = router;
