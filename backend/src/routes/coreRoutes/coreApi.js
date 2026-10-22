const express = require('express');

const { catchErrors } = require('@/handlers/errorHandlers');
const authorize = require('@/auth/authorize');

const router = express.Router();

const adminController = require('@/controllers/coreControllers/adminController');
const settingController = require('@/controllers/coreControllers/settingController');

const { singleStorageUpload } = require('@/middlewares/uploadMiddleware');

// Users may always act on their own account; acting on someone else's needs the permission
const selfOr = (permission) => (req, res, next) =>
  String(req.params.id) === String(req.admin._id) ? next() : authorize(permission)(req, res, next);

// //_______________________________ Admin management_______________________________

router.route('/admin/read/:id').get(selfOr('team:read'), catchErrors(adminController.read));

router
  .route('/admin/password-update/:id')
  .patch(selfOr('team:manage'), catchErrors(adminController.updatePassword));

//_______________________________ Admin Profile (own account) _______________________________

router.route('/admin/profile/password').patch(catchErrors(adminController.updateProfilePassword));
router
  .route('/admin/profile/update')
  .patch(
    singleStorageUpload({ entity: 'admin', fieldName: 'photo', fileType: 'image' }),
    catchErrors(adminController.updateProfile)
  );

// //____________________________________________ Organization settings _________________
// Everyone reads settings (the app needs them to render); only owners and admins change them.
// The permission check comes before the upload so files from unauthorized users are never stored.

const canRead = authorize('setting:read');
const canUpdate = authorize('setting:update');

router.route('/setting/create').post(canUpdate, catchErrors(settingController.create));
router.route('/setting/read/:id').get(canRead, catchErrors(settingController.read));
router.route('/setting/update/:id').patch(canUpdate, catchErrors(settingController.update));
router.route('/setting/search').get(canRead, catchErrors(settingController.search));
router.route('/setting/list').get(canRead, catchErrors(settingController.list));
router.route('/setting/listAll').get(canRead, catchErrors(settingController.listAll));
router.route('/setting/filter').get(canRead, catchErrors(settingController.filter));
router
  .route('/setting/readBySettingKey/:settingKey')
  .get(canRead, catchErrors(settingController.readBySettingKey));
router.route('/setting/listBySettingKey').get(canRead, catchErrors(settingController.listBySettingKey));
router
  .route('/setting/updateBySettingKey{/:settingKey}')
  .patch(canUpdate, catchErrors(settingController.updateBySettingKey));
router
  .route('/setting/upload{/:settingKey}')
  .patch(
    canUpdate,
    catchErrors(
      singleStorageUpload({ entity: 'setting', fieldName: 'settingValue', fileType: 'image' })
    ),
    catchErrors(settingController.updateBySettingKey)
  );
router
  .route('/setting/updateManySetting')
  .patch(canUpdate, catchErrors(settingController.updateManySetting));
module.exports = router;
