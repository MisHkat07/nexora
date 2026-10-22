const express = require('express');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');
const signup = require('@/controllers/coreControllers/signup');

router.route('/login').post(catchErrors(adminAuth.login));

router.route('/forgetpassword').post(catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

// Self-serve signup (only when SIGNUP_ENABLED=true) and email verification
router.route('/public-config').get(catchErrors(signup.publicConfig));
router.route('/register').post(catchErrors(signup.register));
router.route('/verify-email').post(catchErrors(signup.verifyEmail));
router
  .route('/resend-verification')
  .post(adminAuth.isValidAuthToken, catchErrors(signup.resendVerification));

module.exports = router;
