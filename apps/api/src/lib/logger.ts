import pino from 'pino';
import { getConfig } from '../config.js';

const cfg = getConfig();

export const logger = pino({
  level: cfg.LOG_LEVEL,
  ...(cfg.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
      }
    : {}),
});
