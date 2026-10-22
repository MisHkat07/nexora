const { can } = require('./permissions');

/**
 * Route middleware: lets the request through only if the logged-in user's role has the
 * permission, e.g. router.post('/invoice/create', authorize('invoice:create'), handler).
 * Must run after the auth middleware (req.admin).
 */
const authorize = (permission) => (req, res, next) => {
  if (req.admin && can(req.admin.role, permission)) return next();
  return res.status(403).json({
    success: false,
    result: null,
    message: "You don't have permission to do this. Ask an owner or admin of your organization.",
  });
};

module.exports = authorize;
