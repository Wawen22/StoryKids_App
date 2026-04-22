// Provider cost tables (cents per unit). Update as provider pricing changes.
// Source-of-truth is each provider's pricing page; this is a best-effort estimator
// used for cost-cap enforcement and AiCallLog. Actual billing is reconciled via invoices.

export interface TextCost {
  /** cents per 1M input tokens */
  inputPer1M: number;
  /** cents per 1M output tokens */
  outputPer1M: number;
}

export interface ImageCost {
  /** cents per image at the aspect ratio we target */
  perImage: number;
}

// 2026-04 snapshot. Review quarterly.
export const TEXT_COSTS: Record<string, TextCost> = {
  'openai/gpt-4o-mini': { inputPer1M: 15, outputPer1M: 60 },
  'openai/gpt-oss-120b:free': { inputPer1M: 0, outputPer1M: 0 },
};

export const IMAGE_COSTS: Record<string, ImageCost> = {
  'azure:gpt-image-2': { perImage: 4 },
  'gemini:2.0-flash-image': { perImage: 0 },
};

export function estimateTextCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const cost = TEXT_COSTS[model];
  if (!cost) return 0;
  return Math.ceil((inputTokens * cost.inputPer1M + outputTokens * cost.outputPer1M) / 1_000_000);
}

export function estimateImageCost(providerId: string): number {
  return IMAGE_COSTS[providerId]?.perImage ?? 0;
}
