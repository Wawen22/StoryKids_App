import { z } from 'zod';

// ---------- enums ----------

export const StoryStatus = z.enum(['PENDING', 'GENERATING', 'READY', 'FAILED']);
export type StoryStatus = z.infer<typeof StoryStatus>;

export const Theme = z.enum([
  'space',
  'underwater',
  'forest',
  'fairytale',
  'dinosaurs',
  'superhero',
]);
export type Theme = z.infer<typeof Theme>;

export const ArtStyle = z.enum(['watercolor', 'pixar', 'storybook', 'anime']);
export type ArtStyle = z.infer<typeof ArtStyle>;

export const Language = z.enum(['en', 'it', 'es', 'fr', 'de']);
export type Language = z.infer<typeof Language>;

export const Tier = z.enum(['free', 'paid']);
export type Tier = z.infer<typeof Tier>;

// ---------- entities (read models) ----------

export const ChildPhotoDto = z.object({
  id: z.string().uuid(),
  uploadedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signedUrl: z.string().url().optional(),
});
export type ChildPhotoDto = z.infer<typeof ChildPhotoDto>;

export const ChildDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ageYears: z.number().int().min(0).max(18),
  photos: z.array(ChildPhotoDto),
  createdAt: z.string().datetime(),
});
export type ChildDto = z.infer<typeof ChildDto>;

export const StoryPageDto = z.object({
  id: z.string().uuid(),
  index: z.number().int().min(0),
  text: z.string(),
  imageUrl: z.string().url().nullable(),
  locked: z.boolean(),
});
export type StoryPageDto = z.infer<typeof StoryPageDto>;

export const StoryDto = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  status: StoryStatus,
  theme: Theme,
  artStyle: ArtStyle,
  language: Language,
  titleText: z.string().nullable(),
  totalPages: z.number().int().min(1),
  freePagesCount: z.number().int().min(0),
  errorMessage: z.string().nullable(),
  pages: z.array(StoryPageDto),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type StoryDto = z.infer<typeof StoryDto>;

export const SubscriptionDto = z.object({
  isActive: z.boolean(),
  periodType: z.enum(['weekly', 'monthly', 'annual']).nullable(),
  currentEnd: z.string().datetime().nullable(),
});
export type SubscriptionDto = z.infer<typeof SubscriptionDto>;

// ---------- requests ----------

export const CreateChildRequest = z.object({
  name: z.string().min(1).max(50),
  ageYears: z.number().int().min(0).max(18),
  photoCount: z.number().int().min(3).max(5),
});
export type CreateChildRequest = z.infer<typeof CreateChildRequest>;

export const CreateChildResponse = z.object({
  child: ChildDto,
  uploadUrls: z.array(
    z.object({
      photoId: z.string().uuid(),
      url: z.string().url(),
      expiresAt: z.string().datetime(),
    }),
  ),
});
export type CreateChildResponse = z.infer<typeof CreateChildResponse>;

export const CreateStoryRequest = z.object({
  childId: z.string().uuid(),
  theme: Theme,
  artStyle: ArtStyle,
  language: Language.default('en'),
});
export type CreateStoryRequest = z.infer<typeof CreateStoryRequest>;

export const CreateStoryResponse = z.object({
  storyId: z.string().uuid(),
  jobId: z.string(),
  estimatedSeconds: z.number().int().min(1),
});
export type CreateStoryResponse = z.infer<typeof CreateStoryResponse>;

export const ListStoriesResponse = z.object({
  stories: z.array(StoryDto),
});
export type ListStoriesResponse = z.infer<typeof ListStoriesResponse>;

// ---------- errors ----------

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;
