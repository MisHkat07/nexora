const HttpError = require('./httpError');
const logger = require('@/logger');
const Sentry = require('@sentry/node');

/*
  Maps any error to a status code and a message that is safe to send to the client.
  Unexpected errors are logged in full on the server and reported as a generic 500.
*/
const toSafeError = (error) => {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message };
  }
  if (error.isJoi) {
    return { status: 400, message: error.details?.[0]?.message || 'Invalid request' };
  }
  switch (error.name) {
    case 'ValidationError':
      return { status: 400, message: 'Required fields are not supplied' };
    case 'CastError':
    case 'BSONError':
    case 'BSONTypeError':
      return { status: 400, message: 'Invalid ID or value' };
    case 'JsonWebTokenError':
    case 'TokenExpiredError':
    case 'NotBeforeError':
      return { status: 401, message: 'Invalid or expired token' };
  }
  if (error.type === 'entity.parse.failed') {
    return { status: 400, message: 'Malformed JSON body' };
  }
  return { status: 500, message: 'Internal server error' };
};

const sendError = (error, req, res) => {
  const { status, message } = toSafeError(error);
  if (status >= 500) {
    (req.log || logger).error({ err: error }, 'Unhandled error');
    // No-op unless SENTRY_DSN is set
    Sentry.captureException(error, { tags: { requestId: req.id } });
  }
  if (res.headersSent) return;
  const body = { success: false, result: null, message };
  if (status === 401) body.jwtExpired = true;
  // Lets users quote an ID that matches the server log line
  if (status >= 500 && req.id) body.requestId = req.id;
  return res.status(status).json(body);
};

/*
  Catch Errors Handler

  With async/await, you need some way to catch errors
  Instead of using try{} catch(e) {} in each controller, we wrap the function in
  catchErrors(), catch any errors they throw, and send a safe error response
*/
exports.catchErrors = (fn) => {
  return function (req, res, next) {
    return Promise.resolve()
      .then(() => fn(req, res, next))
      .catch((error) => sendError(error, req, res));
  };
};

exports.sendError = sendError;

/*
  Not Found Error Handler

  If we hit a route that is not found, we mark it as 404
*/
exports.notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: "Api url doesn't exist ",
  });
};

/*
  Final Error Handler

  Catches anything passed to next(error). No stack traces or internals are leaked.
*/
exports.productionErrors = (error, req, res, next) => sendError(error, req, res);
