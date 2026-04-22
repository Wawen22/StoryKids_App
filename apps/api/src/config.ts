import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  API_PORT: z.coerce.number().int().default(3000),
  API_HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_JWT_SECRET: z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),

  REDIS_URL: z.string().url(),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),

  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_IMAGE_DEPLOYMENT: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.0-flash-exp-image-generation'),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_TEXT_MODEL_PAID: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_TEXT_MODEL_FREE: z.string().default('openai/gpt-oss-120b:free'),

  REVENUECAT_WEBHOOK_AUTH_HEADER: z.string().min(1).optional(),

  SENTRY_DSN: z.string().url().optional(),
  POSTHOG_API_KEY: z.string().optional(),

  DAILY_SPEND_CAP_CENTS: z.coerce.number().int().default(500),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cached: AppConfig | undefined;
export function getConfig(): AppConfig {
  if (!cached) {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error('Invalid env:', parsed.error.flatten().fieldErrors);
      throw new Error('Invalid environment configuration');
    }
    cached = parsed.data;
  }
  return cached;
}
