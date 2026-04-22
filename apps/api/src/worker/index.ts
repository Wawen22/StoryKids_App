import { Worker } from 'bullmq';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { QUEUE_NAME, PHOTO_SWEEPER_QUEUE, photoSweeperQueue, GenerateStoryJob } from '../lib/queue.js';
import { processStoryJob } from './story-job.js';
import { sweepExpiredPhotos } from './photo-sweeper.js';

async function main(): Promise<void> {
  logger.info('starting worker');

  const storyWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const parsed = GenerateStoryJob.parse(job.data);
      await processStoryJob(job as never);
      return { storyId: parsed.storyId };
    },
    { connection: redis, concurrency: 2 },
  );

  storyWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'story job failed');
  });

  const sweeperWorker = new Worker(
    PHOTO_SWEEPER_QUEUE,
    async () => {
      await sweepExpiredPhotos();
    },
    { connection: redis, concurrency: 1 },
  );

  await photoSweeperQueue.add(
    'sweep',
    {},
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'photo-sweeper-hourly',
    },
  );

  const shutdown = async () => {
    logger.info('worker shutting down');
    await storyWorker.close();
    await sweeperWorker.close();
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'worker fatal');
  process.exit(1);
});
