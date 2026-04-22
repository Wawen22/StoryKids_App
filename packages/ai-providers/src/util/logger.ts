import pino from 'pino';

export const logger = pino({
  name: 'ai-providers',
  level: process.env.LOG_LEVEL ?? 'info',
});
