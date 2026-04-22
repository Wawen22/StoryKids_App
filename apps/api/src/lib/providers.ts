import { createRegistry, type ProviderRegistry } from '@storykids/ai-providers';
import { getConfig } from '../config.js';

let cached: ProviderRegistry | undefined;

export function getProviderRegistry(): ProviderRegistry {
  if (cached) return cached;
  const cfg = getConfig();
  cached = createRegistry({
    azureImage: {
      endpoint: cfg.AZURE_OPENAI_ENDPOINT,
      apiKey: cfg.AZURE_OPENAI_API_KEY,
      deployment: cfg.AZURE_OPENAI_IMAGE_DEPLOYMENT,
    },
    geminiImage: {
      apiKey: cfg.GEMINI_API_KEY,
      model: cfg.GEMINI_IMAGE_MODEL,
    },
    openRouterPaid: {
      apiKey: cfg.OPENROUTER_API_KEY,
      baseURL: cfg.OPENROUTER_BASE_URL,
      model: cfg.OPENROUTER_TEXT_MODEL_PAID,
      appName: 'StoryKids',
    },
    openRouterFree: {
      apiKey: cfg.OPENROUTER_API_KEY,
      baseURL: cfg.OPENROUTER_BASE_URL,
      model: cfg.OPENROUTER_TEXT_MODEL_FREE,
      appName: 'StoryKids',
    },
  });
  return cached;
}
