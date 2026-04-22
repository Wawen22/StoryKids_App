import type { Job } from 'bullmq';
import { z } from 'zod';
import type { ArtStyle, Language, Theme } from '@storykids/shared-types';
import { imageScenePrompt, storyTextPrompt } from '@storykids/prompt-library';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { getProviderRegistry } from '../lib/providers.js';
import { uploadBytes } from '../lib/r2.js';
import { getConfig } from '../config.js';
import type { GenerateStoryJob } from '../lib/queue.js';

const StoryTextShape = z.object({
  title: z.string(),
  pages: z.array(z.object({ text: z.string(), imagePrompt: z.string() })).min(1),
});

const PAGE_COUNT = 10;

export async function processStoryJob(job: Job<GenerateStoryJob>): Promise<void> {
  const cfg = getConfig();
  const { storyId, userId, childId, theme, artStyle, language } = job.data;
  const registry = getProviderRegistry();

  await prisma.story.update({ where: { id: storyId }, data: { status: 'GENERATING' } });

  try {
    await enforceCostCap(userId, cfg.DAILY_SPEND_CAP_CENTS);

    const child = await prisma.child.findFirstOrThrow({ where: { id: childId, userId } });

    const text = await generateText(userId, storyId, child.name, child.ageYears, theme as Theme, artStyle as ArtStyle, language as Language);

    await prisma.$transaction([
      prisma.story.update({
        where: { id: storyId },
        data: {
          titleText: text.title,
          totalPages: text.pages.length,
          providerText: text.providerId,
        },
      }),
      prisma.storyPage.createMany({
        data: text.pages.map((p, idx) => ({
          storyId,
          index: idx,
          text: p.text,
          imagePrompt: p.imagePrompt,
          provider: 'pending',
        })),
      }),
    ]);

    const pages = await prisma.storyPage.findMany({
      where: { storyId },
      orderBy: { index: 'asc' },
    });

    for (const page of pages) {
      const imgResult = await generateImage(
        userId,
        storyId,
        page.index,
        page.imagePrompt,
        artStyle as ArtStyle,
      );
      const key = `users/${userId}/stories/${storyId}/page-${page.index}.png`;
      await uploadBytes(key, imgResult.bytes, imgResult.mimeType);
      await prisma.storyPage.update({
        where: { id: page.id },
        data: { imageKey: key, provider: imgResult.providerId, costCents: imgResult.costCents },
      });
    }

    await prisma.story.update({
      where: { id: storyId },
      data: { status: 'READY', completedAt: new Date(), providerImage: pages[0]?.provider ?? null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, storyId }, 'story generation failed');
    await prisma.story.update({
      where: { id: storyId },
      data: { status: 'FAILED', errorMessage: message },
    });
    throw err;
  }
}

async function enforceCostCap(userId: string, capCents: number): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sum = await prisma.aiCallLog.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { costCents: true },
  });
  const spent = sum._sum.costCents ?? 0;
  if (spent >= capCents) {
    throw new Error(`Daily spend cap exceeded: ${spent}¢ / ${capCents}¢`);
  }
}

async function generateText(
  userId: string,
  storyId: string,
  childName: string,
  childAge: number,
  theme: Theme,
  artStyle: ArtStyle,
  language: Language,
): Promise<{ title: string; pages: { text: string; imagePrompt: string }[]; providerId: string }> {
  const registry = getProviderRegistry();
  const tier = getConfig().NODE_ENV === 'production' ? 'paid' : 'free';
  const provider = registry.text(tier);
  const { system, user } = storyTextPrompt({
    childName,
    childAge,
    theme,
    artStyle,
    language,
    pageCount: PAGE_COUNT,
  });

  const start = Date.now();
  const result = await provider.generate({
    system,
    messages: [{ role: 'user', content: user }],
    jsonSchema: {},
    temperature: 0.9,
    ctx: { userId, storyId },
  });

  await prisma.aiCallLog.create({
    data: {
      userId,
      storyId,
      kind: 'text',
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costCents: result.costCents,
      latencyMs: Date.now() - start,
      success: true,
    },
  });

  const parsed = StoryTextShape.parse(JSON.parse(extractJson(result.text)));
  return { ...parsed, providerId: result.provider };
}

async function generateImage(
  userId: string,
  storyId: string,
  pageIndex: number,
  scenePrompt: string,
  artStyle: ArtStyle,
): Promise<{ bytes: Buffer; mimeType: 'image/png' | 'image/jpeg'; providerId: string; costCents: number }> {
  const registry = getProviderRegistry();
  const provider = registry.image('paid');
  const { prompt, negativePrompt } = imageScenePrompt({ scenePrompt, artStyle });

  const refs = await loadChildReferences(userId, storyId);

  const start = Date.now();
  const result = await provider.generate({
    prompt,
    negativePrompt,
    referenceImages: refs,
    aspectRatio: '3:4',
    ctx: { userId, storyId, pageIndex },
  });

  await prisma.aiCallLog.create({
    data: {
      userId,
      storyId,
      kind: 'image',
      provider: result.provider,
      model: result.model,
      costCents: result.costCents,
      latencyMs: Date.now() - start,
      success: true,
    },
  });

  return {
    bytes: result.bytes,
    mimeType: result.mimeType,
    providerId: result.provider,
    costCents: result.costCents,
  };
}

async function loadChildReferences(userId: string, storyId: string) {
  // MVP: fetch photo keys from DB; R2 download is wired up in Sprint 1 follow-up PR
  // since it requires a GetObjectCommand + stream-to-buffer utility. For now the
  // worker passes text-only prompts and providers fall back to textual identity cues.
  logger.debug({ userId, storyId }, 'reference image loading TBD — see loadChildReferences');
  return [];
}

function extractJson(text: string): string {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (match?.[1]) return match[1];
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text;
}
