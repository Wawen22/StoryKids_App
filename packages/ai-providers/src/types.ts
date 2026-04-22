export type Tier = 'free' | 'paid';

export interface CallContext {
  userId: string;
  storyId?: string;
  pageIndex?: number;
}

// ---------- Image ----------

export interface ReferenceImage {
  bytes: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
}

export interface ImageGenParams {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  seed?: number;
  ctx: CallContext;
}

export interface ImageGenResult {
  bytes: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
  provider: string;
  model: string;
  latencyMs: number;
  costCents: number;
  rawMeta?: Record<string, unknown>;
}

export interface ImageProvider {
  readonly id: string;
  generate(p: ImageGenParams): Promise<ImageGenResult>;
}

// ---------- Text ----------

export interface TextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TextGenParams {
  system: string;
  messages: TextMessage[];
  /** When present, request JSON and validate client-side. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  ctx: CallContext;
}

export interface TextGenResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costCents: number;
}

export interface TextProvider {
  readonly id: string;
  generate(p: TextGenParams): Promise<TextGenResult>;
}

// ---------- Registry ----------

export interface ProviderRegistry {
  image(tier: Tier): ImageProvider;
  text(tier: Tier): TextProvider;
}

// ---------- Errors ----------

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AIProviderError';
  }
}
