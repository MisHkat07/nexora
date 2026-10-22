const pino = require('pino');

const env = process.env.NODE_ENV || 'development';

// Human-readable logs in development (pino-pretty is a dev dependency), JSON everywhere else
const prettyTransport = () => {
  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } };
  } catch (error) {
    return undefined;
  }
};

const logger = pino({
  level: process.env.LOG_LEVEL || (env === 'test' ? 'silent' : 'info'),
  transport: env === 'development' ? prettyTransport() : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.query.token'],
});

module.exports = logger;
