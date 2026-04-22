import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { getConfig } from '../config.js';

const cfg = getConfig();
const secret = new TextEncoder().encode(cfg.SUPABASE_JWT_SECRET);

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Missing Bearer token' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const sub = payload.sub;
    const email = payload['email'];
    if (typeof sub !== 'string' || typeof email !== 'string') {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token payload' });
    }
    req.user = { userId: sub, email };
  } catch {
    return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}
