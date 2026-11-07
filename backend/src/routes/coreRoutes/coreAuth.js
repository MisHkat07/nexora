const express = require('express');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');
const signup = require('@/controllers/coreControllers/signup');
const team = require('@/controllers/coreControllers/team');
const sessions = require('@/controllers/coreControllers/sessionsController');
const twoFactor = require('@/controllers/coreControllers/twoFactor');

router.route('/login').post(catchErrors(adminAuth.login));

router.route('/forgetpassword').post(catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));
// The refresh cookie is only sent to /api/auth, so logout and refresh live here too.
// These work after the access token has expired: the cookie is the credential.
router.route('/auth/refresh').post(catchErrors(sessions.refresh));
router.route('/auth/logout').post(catchErrors(adminAuth.logout));

router.route('/auth/sessions').get(adminAuth.isValidAuthToken, catchErrors(sessions.list));
router.route('/auth/sessions/:id').delete(adminAuth.isValidAuthToken, catchErrors(sessions.revokeOne));
router.route('/auth/logout-all').post(adminAuth.isValidAuthToken, catchErrors(sessions.revokeAll));

router.route('/auth/2fa/challenge').post(catchErrors(twoFactor.challenge));
router.route('/auth/2fa/setup').post(adminAuth.isValidAuthToken, catchErrors(twoFactor.setup));
router.route('/auth/2fa/confirm').post(adminAuth.isValidAuthToken, catchErrors(twoFactor.confirm));
router.route('/auth/2fa/disable').post(adminAuth.isValidAuthToken, catchErrors(twoFactor.disable));

// Self-serve signup (only when SIGNUP_ENABLED=true) and email verification
router.route('/public-config').get(catchErrors(signup.publicConfig));
router.route('/register').post(catchErrors(signup.register));
router.route('/verify-email').post(catchErrors(signup.verifyEmail));
router
  .route('/resend-verification')
  .post(adminAuth.isValidAuthToken, catchErrors(signup.resendVerification));

// Accepting a team invitation (the invitee has no account session yet)
router.route('/invite/:userId/:token').get(catchErrors(team.inviteDetails));
router.route('/accept-invite').post(catchErrors(team.acceptInvite));

module.exports = router;
