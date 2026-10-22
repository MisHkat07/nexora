/*
  Error tracking. Loaded by server.js before express and mongoose so Sentry can instrument them.
  Does nothing unless SENTRY_DSN is set.
*/
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Render sets RENDER_GIT_COMMIT, so errors are tied to the deployed commit
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    // Customer data stays out of Sentry: no IPs, cookies or request bodies
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        // Download links carry a signed token in the query string
        if (event.request.query_string) event.request.query_string = '[redacted]';
      }
      return event;
    },
  });
}

module.exports = Sentry;
