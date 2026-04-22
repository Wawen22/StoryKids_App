import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { AIProviderError, type ImageGenParams, type ImageGenResult, type ImageProvider } from '../types.js';
import { estimateImageCost } from '../util/cost.js';
import { logger } from '../util/logger.js';

export interface GeminiImageConfig {
  apiKey: string;
  model: string;
}

/**
 * Gemini 2.0 Flash Image adapter. Supports multimodal input (text + reference images)
 * natively — this is a genuine advantage over Azure gpt-image-2 for the
 * face-consistency use case.
 */
export class GeminiImageProvider implements ImageProvider {
  readonly id = 'gemini:2.0-flash-image';
  private client: GoogleGenerativeAI;

  constructor(private cfg: GeminiImageConfig) {
    this.client = new GoogleGenerativeAI(cfg.apiKey);
  }

  async generate(p: ImageGenParams): Promise<ImageGenResult> {
    const start = Date.now();
    const model = this.client.getGenerativeModel({ model: this.cfg.model });

    const parts: Part[] = [
      { text: composePrompt(p) },
      ...(p.referenceImages ?? []).map((img) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.bytes.toString('base64'),
        },
      })),
    ];

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as Record<string, unknown>,
      } as Parameters<typeof model.generateContent>[0]);

      const candidate = response.response.candidates?.[0];
      const imagePart = candidate?.content.parts.find((part) => 'inlineData' in part && part.inlineData);

      if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData) {
        throw new AIProviderError(this.id, 'no image returned by Gemini');
      }

      const bytes = Buffer.from(imagePart.inlineData.data, 'base64');
      const mimeType = imagePart.inlineData.mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const latencyMs = Date.now() - start;

      logger.info(
        { provider: this.id, latencyMs, ...p.ctx },
        'image generated',
      );

      return {
        bytes,
        mimeType,
        provider: this.id,
        model: this.cfg.model,
        latencyMs,
        costCents: estimateImageCost(this.id),
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(this.id, message, err, false);
    }
  }
}

function composePrompt(p: ImageGenParams): string {
  const aspect = p.aspectRatio ? ` Aspect ratio: ${p.aspectRatio}.` : '';
  const negative = p.negativePrompt ? ` Avoid: ${p.negativePrompt}.` : '';
  const identity = p.referenceImages?.length
    ? ' Preserve the facial identity from the attached reference image — the same child must be clearly recognizable.'
    : '';
  return `${p.prompt}${aspect}${negative}${identity}`;
}
