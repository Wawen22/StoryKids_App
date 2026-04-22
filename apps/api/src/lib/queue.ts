import { Queue, QueueEvents } from 'bullmq';
import { z } from 'zod';
import { redis } from './redis.js';

export const QUEUE_NAME = 'story-generation';

export const GenerateStoryJob = z.object({
  storyId: z.string().uuid(),
  userId: z.string(),
  childId: z.string().uuid(),
  theme: z.string(),
  artStyle: z.string(),
  language: z.string(),
});
export type GenerateStoryJob = z.infer<typeof GenerateStoryJob>;

export const storyQueue = new Queue<GenerateStoryJob>(QUEUE_NAME, { connection: redis });

export const storyQueueEvents = new QueueEvents(QUEUE_NAME, { connection: redis });

export const PHOTO_SWEEPER_QUEUE = 'photo-sweeper';
export const photoSweeperQueue = new Queue(PHOTO_SWEEPER_QUEUE, { connection: redis });
