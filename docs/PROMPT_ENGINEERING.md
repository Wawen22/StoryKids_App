# Prompt engineering

All production prompts live in `packages/prompt-library/` as typed TS functions. Never inline a prompt in business code. Prompts are versioned — when we change one, we bump its `version` so logs can correlate output quality to prompt vintage.

## Principles

1. **Structured output over free text.** Whenever the worker needs to parse the response (story text broken into pages), request JSON with a schema and validate with Zod before using it.
2. **Reference images for consistency.** Image generation always receives at least one reference photo of the child. Prompts emphasize identity preservation ("the same child as the reference, in …").
3. **Style anchors.** Each art style (watercolor, Pixar-ish, …) has a style-prompt fragment reused across all pages of a story. Never re-describe style per page — derive it from the chosen `artStyle` constant.
4. **Negative prompts.** For image providers that support them, include: `no text, no watermark, no multiple children, no adults, child-safe, wholesome`.
5. **Deterministic seeds** where supported (Azure gpt-image-2 supports seed). Same story id → same seed → reproducible generation for debugging.

## Prompt categories

### Story text (`packages/prompt-library/src/story-text.ts`)

Input: child name, age, theme, art style, target language, desired page count.
Output: JSON `{ title: string, pages: Array<{ text: string, imagePrompt: string }> }`. `imagePrompt` is what we feed the image provider for that page — authored by the text LLM, then post-processed to prepend the style anchor.

### Image scene (`packages/prompt-library/src/image-scene.ts`)

Input: page text, style anchor, child identity description.
Output: a single prompt string passed to the image provider, plus any negative prompt the provider accepts.

## Versioning

Each prompt function returns `{ prompt, version }`. `AiCallLog.rawMeta` stores the version. When A/B testing prompt variants, bump the version and route a fraction of users via feature flag in PostHog.

## Evaluation

- Sprint 0's `experiments/face-consistency-test/` is the first evaluation harness.
- Long-term: a nightly eval job re-generates a fixed set of stories and compares perceptual hashes + human-graded consistency scores (TBD, Phase 2).
