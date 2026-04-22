import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.js';
import { healthRoutes } from './routes/health.js';
import { childrenRoutes } from './routes/children.js';
import { storiesRoutes } from './routes/stories.js';
import { webhookRoutes } from './routes/webhooks.js';
import { meRoutes } from './routes/me.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(sensible);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes);
  await app.register(childrenRoutes);
  await app.register(storiesRoutes);
  await app.register(webhookRoutes);
  await app.register(meRoutes);

  return app;
}
