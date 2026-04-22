import { Redis } from 'ioredis';
import { getConfig } from '../config.js';

export const redis = new Redis(getConfig().REDIS_URL, {
  maxRetriesPerRequest: null,
});
