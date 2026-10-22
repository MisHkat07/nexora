const express = require('express');
const path = require('path');
const fs = require('fs');

const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const pinoHttp = require('pino-http');
const crypto = require('crypto');
const mongoose = require('mongoose');

const config = require('./config');
const logger = require('./logger');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');

const errorHandlers = require('./handlers/errorHandlers');
const { requestContext } = require('./tenancy/context');
const erpApiRouter = require('./routes/appRoutes/appApi');

// create our Express app
const app = express();

app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

// Liveness and readiness probes (kept above logging and rate limits)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'database unavailable' });
});

// One log line per request, tagged with an ID that is also returned to the client
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url.startsWith('/assets/') },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url.split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // antd injects its styles at runtime, so inline styles must stay allowed
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        // Sentry ingest hosts, for frontend error reports (VITE_SENTRY_DSN)
        'connect-src': ["'self'", ...config.corsOrigins, 'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io'],
      },
    },
    // Uploaded logos are loaded cross-origin by the dev server and PDF renderer
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Browsers may only call the API from the configured origins (same-origin always works)
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Each request gets its own tenant context; auth fills in the organization (see src/tenancy)
app.use(requestContext);
// Express 5 leaves req.body undefined when there is no body; handlers expect an object
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use(compression());

const rateLimitResponse = {
  success: false,
  result: null,
  message: 'Too many requests, please try again later.',
};

// Brute-force protection for login and password reset
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitResponse,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rateLimitResponse,
});

app.use(['/api/login', '/api/forgetpassword', '/api/resetpassword'], authLimiter);
app.use(['/api', '/download'], apiLimiter);

// Here our API Routes

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// Serve the built frontend (frontend/dist) so one server hosts both API and UI
const frontendDist = config.frontendDist || path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist, { index: false }));
  // SPA fallback: any non-API GET returns index.html so client-side routes work
  app.get(/^\/(?!api|download|public).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// Final error handler: never leaks stack traces or internals
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
