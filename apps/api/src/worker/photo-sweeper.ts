import { prisma } from '../lib/prisma.js';
import { deleteObject } from '../lib/r2.js';
import { logger } from '../lib/logger.js';

export async function sweepExpiredPhotos(): Promise<void> {
  const now = new Date();
  const expired = await prisma.childPhoto.findMany({
    where: { expiresAt: { lt: now }, deletedAt: null },
    take: 200,
  });

  for (const photo of expired) {
    try {
      await deleteObject(photo.r2Key);
      await prisma.childPhoto.update({
        where: { id: photo.id },
        data: { deletedAt: new Date() },
      });
      logger.info({ photoId: photo.id }, 'expired photo deleted');
    } catch (err) {
      logger.error({ err, photoId: photo.id }, 'failed to delete expired photo');
    }
  }
}
