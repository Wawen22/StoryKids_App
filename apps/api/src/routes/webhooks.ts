import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getConfig } from '../config.js';
import { logger } from '../lib/logger.js';

const cfg = getConfig();

const RevenueCatWebhook = z.object({
  event: z.object({
    type: z.string(),
    id: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    entitlement_ids: z.array(z.string()).optional(),
    period_type: z.string().optional(),
    expiration_at_ms: z.number().optional(),
  }),
});

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);
const INACTIVE_EVENTS = new Set(['CANCELLATION', 'EXPIRATION', 'SUBSCRIPTION_PAUSED', 'REFUND']);

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/webhooks/revenuecat', async (req, reply) => {
    const expected = cfg.REVENUECAT_WEBHOOK_AUTH_HEADER;
    if (expected && req.headers.authorization !== expected) {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid webhook auth' });
    }

    const parsed = RevenueCatWebhook.safeParse(req.body);
    if (!parsed.success) {
      logger.warn({ err: parsed.error.flatten() }, 'invalid RC webhook payload');
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'Invalid payload' });
    }

    const { event } = parsed.data;
    const isActive = ACTIVE_EVENTS.has(event.type)
      ? true
      : INACTIVE_EVENTS.has(event.type)
        ? false
        : undefined;
    if (isActive === undefined) {
      return reply.code(200).send({ ok: true, ignored: event.type });
    }

    const currentEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

    await prisma.subscription.upsert({
      where: { userId: event.app_user_id },
      create: {
        userId: event.app_user_id,
        isActive,
        rcEntitlement: event.entitlement_ids?.[0] ?? null,
        rcProductId: event.product_id ?? null,
        periodType: event.period_type ?? null,
        currentEnd,
        lastWebhookAt: new Date(),
        raw: parsed.data as unknown as object,
      },
      update: {
        isActive,
        rcEntitlement: event.entitlement_ids?.[0] ?? null,
        rcProductId: event.product_id ?? null,
        periodType: event.period_type ?? null,
        currentEnd,
        lastWebhookAt: new Date(),
        raw: parsed.data as unknown as object,
      },
    });

    return reply.code(200).send({ ok: true });
  });
}
