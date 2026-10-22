import * as Sentry from '@sentry/react';

// Browser error tracking; does nothing unless VITE_SENTRY_DSN is set at build time
const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
  });
}

export default Sentry;
