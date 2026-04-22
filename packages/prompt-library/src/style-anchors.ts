import type { ArtStyle } from '@storykids/shared-types';

/**
 * Reusable style descriptions appended to every page's image prompt.
 * Keep them short and concrete — image models follow adjectives more than adverbs.
 */
export const STYLE_ANCHORS: Record<ArtStyle, string> = {
  watercolor:
    'soft watercolor illustration, warm pastel palette, gentle brush strokes, children book aesthetic',
  pixar:
    '3D rendered, Pixar-style, expressive large eyes, soft rim lighting, cinematic composition',
  storybook:
    'classic storybook illustration, painterly, rich colors, whimsical, reminiscent of Quentin Blake',
  anime: 'modern anime illustration, cel-shaded, vibrant colors, expressive, Studio Ghibli inspired',
};

export const GLOBAL_NEGATIVE_PROMPT =
  'no text, no watermark, no multiple children, no adults in the main focus, child-safe, wholesome, no scary imagery';
