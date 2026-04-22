import type { ArtStyle } from '@storykids/shared-types';
import { GLOBAL_NEGATIVE_PROMPT, STYLE_ANCHORS } from './style-anchors.js';

export interface ImageScenePromptInput {
  /** The sentence emitted by the text LLM describing the scene. */
  scenePrompt: string;
  artStyle: ArtStyle;
  /** Compact identity cue the text model or the caller can provide. */
  childIdentity?: string;
}

export interface ImageScenePromptOutput {
  prompt: string;
  negativePrompt: string;
  version: string;
}

const VERSION = '2026-04-22.v1';

export function imageScenePrompt(input: ImageScenePromptInput): ImageScenePromptOutput {
  const identity = input.childIdentity
    ? ` The main character is ${input.childIdentity}; preserve the facial identity from the reference image.`
    : ' Preserve the facial identity from the reference image — the same child must be clearly recognizable.';

  const prompt = `${input.scenePrompt}${identity} Illustration style: ${STYLE_ANCHORS[input.artStyle]}.`;

  return {
    prompt,
    negativePrompt: GLOBAL_NEGATIVE_PROMPT,
    version: VERSION,
  };
}
