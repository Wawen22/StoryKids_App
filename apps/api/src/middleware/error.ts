import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export function errorHandler(
  err: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  if (err instanceof ZodError) {
    reply.code(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.flatten(),
    });
    return;
  }

  const statusCode = (err as FastifyError).statusCode ?? 500;
  if (statusCode >= 500) {
    logger.error({ err, url: req.url }, 'unhandled error');
  }

  reply.code(statusCode).send({
    code: (err as FastifyError).code ?? 'INTERNAL_ERROR',
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  });
}
