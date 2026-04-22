import OpenAI from 'openai';
import { AIProviderError, type ImageGenParams, type ImageGenResult, type ImageProvider } from '../types.js';
import { estimateImageCost } from '../util/cost.js';
import { logger } from '../util/logger.js';

export interface AzureImageConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

/**
 * Azure OpenAI gpt-image-2 adapter. Uses the Azure v1 API surface which is
 * compatible with the OpenAI SDK via custom baseURL.
 */
export class AzureImageProvider implements ImageProvider {
  readonly id = 'azure:gpt-image-2';
  private client: OpenAI;

  constructor(private cfg: AzureImageConfig) {
    this.client = new OpenAI({
      baseURL: cfg.endpoint,
      apiKey: cfg.apiKey,
    });
  }

  async generate(p: ImageGenParams): Promise<ImageGenResult> {
    const start = Date.now();
    const size = aspectToSize(p.aspectRatio);

    try {
      const response = await this.client.images.generate({
        model: this.cfg.deployment,
        prompt: composePrompt(p),
        size,
        response_format: 'b64_json',
        n: 1,
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new AIProviderError(this.id, 'empty response: no b64_json in data[0]');
      }

      const bytes = Buffer.from(b64, 'base64');
      const latencyMs = Date.now() - start;

      logger.info(
        { provider: this.id, latencyMs, ...p.ctx },
        'image generated',
      );

      return {
        bytes,
        mimeType: 'image/png',
        provider: this.id,
        model: this.cfg.deployment,
        latencyMs,
        costCents: estimateImageCost(this.id),
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(this.id, message, err, isRetryable(err));
    }
  }
}

function aspectToSize(aspect: ImageGenParams['aspectRatio']): '1024x1024' | '1024x1792' | '1792x1024' {
  switch (aspect) {
    case '3:4':
      return '1024x1792';
    case '4:3':
    case '16:9':
      return '1792x1024';
    case '1:1':
    default:
      return '1024x1024';
  }
}

function composePrompt(p: ImageGenParams): string {
  // gpt-image-2 image-variation endpoints accept reference images, but the `images.generate`
  // endpoint used here relies on textual identity hints. Reference-image input for this
  // deployment is wired via the /edits or reference API when/if available; we pass identity
  // cues in the prompt meanwhile and flag this in the Sprint 0 experiment.
  const negative = p.negativePrompt ? ` NEGATIVE: ${p.negativePrompt}` : '';
  return `${p.prompt}${negative}`;
}

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    return status === 429 || (typeof status === 'number' && status >= 500);
  }
  return false;
}
