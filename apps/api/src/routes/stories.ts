import type { FastifyInstance } from 'fastify';
import {
  CreateStoryRequest,
  type CreateStoryResponse,
  type ListStoriesResponse,
  type StoryDto,
} from '@storykids/shared-types';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { storyQueue } from '../lib/queue.js';
import { publicUrl } from '../lib/r2.js';

export async function storiesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/stories', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user!;
    const body = CreateStoryRequest.parse(req.body);

    const child = await prisma.child.findFirst({
      where: { id: body.childId, userId: user.userId, deletedAt: null },
    });
    if (!child) {
      return reply.code(404).send({ code: 'CHILD_NOT_FOUND', message: 'Child not found' });
    }

    const hasLivePhoto = await prisma.childPhoto.findFirst({
      where: { childId: child.id, deletedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!hasLivePhoto) {
      return reply
        .code(409)
        .send({ code: 'NO_PHOTOS', message: 'Upload photos before generating a story' });
    }

    const story = await prisma.story.create({
      data: {
        userId: user.userId,
        childId: child.id,
        theme: body.theme,
        artStyle: body.artStyle,
        language: body.language,
      },
    });

    const job = await storyQueue.add('generate', {
      storyId: story.id,
      userId: user.userId,
      childId: child.id,
      theme: body.theme,
      artStyle: body.artStyle,
      language: body.language,
    });

    await prisma.story.update({ where: { id: story.id }, data: { jobId: String(job.id) } });

    const response: CreateStoryResponse = {
      storyId: story.id,
      jobId: String(job.id),
      estimatedSeconds: 90,
    };
    return reply.code(202).send(response);
  });

  app.get<{ Params: { id: string } }>(
    '/v1/stories/:id',
    { preHandler: requireAuth },
    async (req, reply) => {
      const user = req.user!;
      const story = await prisma.story.findFirst({
        where: { id: req.params.id, userId: user.userId },
        include: { pages: { orderBy: { index: 'asc' } } },
      });
      if (!story) {
        return reply.code(404).send({ code: 'STORY_NOT_FOUND', message: 'Story not found' });
      }
      return serializeStory(story, user.userId);
    },
  );

  app.get('/v1/stories', { preHandler: requireAuth }, async (req) => {
    const user = req.user!;
    const stories = await prisma.story.findMany({
      where: { userId: user.userId },
      include: { pages: { orderBy: { index: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    const response: ListStoriesResponse = {
      stories: await Promise.all(stories.map((s) => serializeStory(s, user.userId))),
    };
    return response;
  });
}

type StoryWithPages = Awaited<ReturnType<typeof prisma.story.findFirstOrThrow>> & {
  pages: Awaited<ReturnType<typeof prisma.storyPage.findMany>>;
};

async function serializeStory(story: StoryWithPages, userId: string): Promise<StoryDto> {
  const hasSubscription = await userHasActiveSubscription(userId);
  return {
    id: story.id,
    childId: story.childId,
    status: story.status,
    theme: story.theme as StoryDto['theme'],
    artStyle: story.artStyle as StoryDto['artStyle'],
    language: story.language as StoryDto['language'],
    titleText: story.titleText,
    totalPages: story.totalPages,
    freePagesCount: story.freePagesCount,
    errorMessage: story.errorMessage,
    pages: story.pages.map((p) => {
      const locked = !hasSubscription && p.index >= story.freePagesCount;
      return {
        id: p.id,
        index: p.index,
        text: locked ? '' : p.text,
        imageUrl: locked || !p.imageKey ? null : publicUrl(p.imageKey),
        locked,
      };
    }),
    createdAt: story.createdAt.toISOString(),
    completedAt: story.completedAt?.toISOString() ?? null,
  };
}

async function userHasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  if (!sub.isActive) return false;
  if (sub.currentEnd && sub.currentEnd < new Date()) return false;
  return true;
}
