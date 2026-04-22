import OpenAI from 'openai';
import { AIProviderError, type TextGenParams, type TextGenResult, type TextProvider } from '../types.js';
import { estimateTextCost } from '../util/cost.js';
import { logger } from '../util/logger.js';

export interface OpenRouterTextConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  appName?: string;
  appUrl?: string;
}

/**
 * OpenRouter text adapter via OpenAI-compatible API. Used for story text generation.
 * Supports both paid (e.g. openai/gpt-4o-mini) and free (e.g. openai/gpt-oss-120b:free) models.
 * Free models are DEV ONLY — their ToS typically allow prompt logging for training.
 */
export class OpenRouterTextProvider implements TextProvider {
  readonly id: string;
  private client: OpenAI;

  constructor(private cfg: OpenRouterTextConfig) {
    this.id = `openrouter:${cfg.model}`;
    this.client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      defaultHeaders: {
        ...(cfg.appUrl ? { 'HTTP-Referer': cfg.appUrl } : {}),
        ...(cfg.appName ? { 'X-Title': cfg.appName } : {}),
      },
    });
  }

  async generate(p: TextGenParams): Promise<TextGenResult> {
    const start = Date.now();

    const messages = [
      { role: 'system' as const, content: p.system },
      ...p.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.cfg.model,
        messages,
        temperature: p.temperature ?? 0.8,
        ...(p.maxOutputTokens !== undefined ? { max_tokens: p.maxOutputTokens } : {}),
        ...(p.jsonSchema !== undefined ? { response_format: { type: 'json_object' } } : {}),
      });

      const choice = response.choices[0];
      const text = choice?.message?.content;
      if (!text) {
        throw new AIProviderError(this.id, 'empty response: no content in choices[0]');
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
      const latencyMs = Date.now() - start;

      logger.info(
        { provider: this.id, latencyMs, inputTokens, outputTokens, ...p.ctx },
        'text generated',
      );

      return {
        text,
        provider: this.id,
        model: this.cfg.model,
        inputTokens,
        outputTokens,
        latencyMs,
        costCents: estimateTextCost(this.cfg.model, inputTokens, outputTokens),
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(this.id, message, err, isRetryable(err));
    }
  }
}

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    return status === 429 || (typeof status === 'number' && status >= 500);
  }
  return false;
}
