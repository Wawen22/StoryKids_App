import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { CreateChildRequest, type CreateChildResponse } from '@storykids/shared-types';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { createPresignedPutUrl } from '../lib/r2.js';

const PHOTO_TTL_MS = 48 * 60 * 60 * 1000;

export async function childrenRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/children', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user!;
    const body = CreateChildRequest.parse(req.body);

    await prisma.user.upsert({
      where: { id: user.userId },
      update: {},
      create: { id: user.userId, email: user.email },
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PHOTO_TTL_MS);

    const child = await prisma.child.create({
      data: {
        userId: user.userId,
        name: body.name,
        ageYears: body.ageYears,
      },
    });

    const photos = await Promise.all(
      Array.from({ length: body.photoCount }, async () => {
        const photoId = randomUUID();
        const key = `users/${user.userId}/children/${child.id}/${photoId}.jpg`;
        await prisma.childPhoto.create({
          data: {
            id: photoId,
            childId: child.id,
            r2Key: key,
            uploadedAt: now,
            expiresAt,
          },
        });
        const url = await createPresignedPutUrl(key);
        return { photoId, url, expiresAt: expiresAt.toISOString() };
      }),
    );

    const response: CreateChildResponse = {
      child: {
        id: child.id,
        name: child.name,
        ageYears: child.ageYears,
        createdAt: child.createdAt.toISOString(),
        photos: photos.map((p) => ({
          id: p.photoId,
          uploadedAt: now.toISOString(),
          expiresAt: p.expiresAt,
        })),
      },
      uploadUrls: photos,
    };
    return reply.code(201).send(response);
  });
}
