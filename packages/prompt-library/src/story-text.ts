import type { ArtStyle, Language, Theme } from '@storykids/shared-types';

export interface StoryTextPromptInput {
  childName: string;
  childAge: number;
  theme: Theme;
  artStyle: ArtStyle;
  language: Language;
  pageCount: number;
}

export interface StoryTextPromptOutput {
  system: string;
  user: string;
  version: string;
}

const VERSION = '2026-04-22.v1';

const LANG_NAMES: Record<Language, string> = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

const THEME_BLURBS: Record<Theme, string> = {
  space: 'an outer space adventure with planets, stars and friendly aliens',
  underwater: 'an underwater adventure with colorful sea creatures and coral reefs',
  forest: 'a magical forest quest with gentle animals and whispering trees',
  fairytale: 'a classic fairytale with enchanted castles and kind creatures',
  dinosaurs: 'a prehistoric adventure with friendly dinosaurs in lush valleys',
  superhero: 'a superhero origin story with small acts of kindness as superpowers',
};

export function storyTextPrompt(input: StoryTextPromptInput): StoryTextPromptOutput {
  const system = `You are a children's storybook author. You write short, warm, age-appropriate stories for young children. Output must be strictly valid JSON matching the schema the user describes — no markdown, no prose outside the JSON.`;

  const user = `Write a personalized storybook in ${LANG_NAMES[input.language]} for a ${input.childAge}-year-old child named "${input.childName}".

Theme: ${THEME_BLURBS[input.theme]}.
The child is the protagonist. Use their name naturally. Keep each page to 2–3 short sentences.
Story must be wholesome, gentle, and age-appropriate. No fear, no conflict beyond small challenges solved with kindness.

Output exactly ${input.pageCount} pages as JSON with this schema:

{
  "title": "<short story title in ${LANG_NAMES[input.language]}>",
  "pages": [
    {
      "text": "<2-3 short sentences of narrative, in ${LANG_NAMES[input.language]}>",
      "imagePrompt": "<one sentence in English describing the visual scene for this page: setting, action, mood. Do NOT describe the child's appearance — only the scene around them.>"
    }
  ]
}

Return only the JSON. No commentary.`;

  return { system, user, version: VERSION };
}
