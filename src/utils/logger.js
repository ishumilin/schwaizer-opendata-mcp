import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Pino logger configured for development or production output formats.
 */
export const logger = isProd
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
    })
  : pino({
      level: process.env.LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
