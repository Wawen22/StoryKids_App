import type { ArtStyle } from '@storykids/shared-types';

export const TEST_ART_STYLE: ArtStyle = 'watercolor';

/** Five diverse scenes designed to stress identity preservation across environments. */
export const SCENES: { label: string; scenePrompt: string }[] = [
  {
    label: 'scene-1-forest',
    scenePrompt:
      'The child stands in a sunlit forest clearing, looking up at a friendly owl perched on a low branch. Soft morning light filters through leaves.',
  },
  {
    label: 'scene-2-underwater',
    scenePrompt:
      'The child swims gently among colorful tropical fish near a coral reef, wearing a simple snorkel mask. Sunbeams pierce the turquoise water.',
  },
  {
    label: 'scene-3-space',
    scenePrompt:
      'The child floats inside a cozy spaceship cabin, looking out a round porthole at Earth rising over the moon. Warm cabin lighting.',
  },
  {
    label: 'scene-4-bakery',
    scenePrompt:
      'The child stands on a stool in a warm bakery kitchen, proudly decorating a small round cake with fruit. Shelves of bread behind.',
  },
  {
    label: 'scene-5-castle',
    scenePrompt:
      'The child walks through the grand hall of a fairytale castle, friendly stained-glass windows casting colorful light on the stone floor.',
  },
];
