import { AzureImageProvider, type AzureImageConfig } from './providers/azure-image.js';
import { GeminiImageProvider, type GeminiImageConfig } from './providers/gemini-image.js';
import { OpenRouterTextProvider, type OpenRouterTextConfig } from './providers/openrouter-text.js';
import type { ImageProvider, ProviderRegistry, TextProvider, Tier } from './types.js';

export interface RegistryConfig {
  azureImage: AzureImageConfig;
  geminiImage: GeminiImageConfig;
  openRouterPaid: OpenRouterTextConfig;
  openRouterFree: OpenRouterTextConfig;
  /** override defaults (e.g. during provider outage) */
  imageOverride?: 'azure' | 'gemini';
}

export function createRegistry(cfg: RegistryConfig): ProviderRegistry {
  const azure = new AzureImageProvider(cfg.azureImage);
  const gemini = new GeminiImageProvider(cfg.geminiImage);
  const paidText = new OpenRouterTextProvider(cfg.openRouterPaid);
  const freeText = new OpenRouterTextProvider(cfg.openRouterFree);

  return {
    image(tier: Tier): ImageProvider {
      if (cfg.imageOverride === 'azure') return azure;
      if (cfg.imageOverride === 'gemini') return gemini;
      return tier === 'paid' ? azure : gemini;
    },
    text(tier: Tier): TextProvider {
      // Free text models only permitted in dev; prod calls should always pass 'paid'.
      return tier === 'paid' ? paidText : freeText;
    },
  };
}
