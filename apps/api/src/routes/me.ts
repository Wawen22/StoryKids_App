import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/me/export', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user!;
    // MVP: enqueue a background job (Sprint 1 ships the stub; job processor in Sprint 2).
    logger.info({ userId: user.userId }, 'GDPR export requested');
    return reply.code(202).send({
      status: 'queued',
      message: 'Your data export will be emailed within 7 days.',
    });
  });

  app.delete('/v1/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user!;
    // 7-day soft-delete grace, actual hard delete via scheduled job
    await prisma.user.update({
      where: { id: user.userId },
      data: { deletedAt: new Date() },
    });
    logger.warn({ userId: user.userId }, 'GDPR deletion requested');
    return reply.code(202).send({
      status: 'queued',
      message: 'Your account will be permanently deleted within 7 days.',
    });
  });
}
