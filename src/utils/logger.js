import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Pino logger configured for development or production output formats.
 * IMPORTANT: All logs are routed to STDERR so STDOUT remains clean for MCP JSON-RPC.
 */
export const logger = isProd
  ? pino(
      { level: process.env.LOG_LEVEL || 'info' },
      // Route logs to STDERR in production
      pino.destination(2)
    )
  : pino(
      { level: process.env.LOG_LEVEL || 'debug' },
      // Pretty printing in development, but still write to STDERR
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          destination: 2, // STDERR
        },
      })
    );
