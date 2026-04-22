import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  AzureImageProvider,
  GeminiImageProvider,
  type ImageProvider,
  type ReferenceImage,
} from '@storykids/ai-providers';
import { imageScenePrompt } from '@storykids/prompt-library';
import { SCENES, TEST_ART_STYLE } from './scenes.js';
import { writeReport, type ReportEntry } from './report.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INPUT_DIR = path.join(ROOT, 'input');
const OUTPUT_DIR = path.join(ROOT, 'output');

async function main(): Promise<void> {
  requireEnv([
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_IMAGE_DEPLOYMENT',
    'GEMINI_API_KEY',
    'GEMINI_IMAGE_MODEL',
  ]);

  const references = await loadReferences();
  if (references.length === 0) {
    throw new Error(`No reference photos in ${INPUT_DIR}. Add reference-1.jpg before running.`);
  }

  await fs.mkdir(path.join(OUTPUT_DIR, 'azure'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'gemini'), { recursive: true });

  const azure = new AzureImageProvider({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    deployment: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT!,
  });

  const gemini = new GeminiImageProvider({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_IMAGE_MODEL!,
  });

  const entries: ReportEntry[] = [];
  const referencePaths: string[] = [];
  for (const r of references) referencePaths.push(r.path);

  for (const scene of SCENES) {
    console.info(`\n=== ${scene.label} ===`);

    const { prompt, negativePrompt } = imageScenePrompt({
      scenePrompt: scene.scenePrompt,
      artStyle: TEST_ART_STYLE,
    });

    const azureResult = await tryGenerate(
      azure,
      references.map((r) => r.img),
      prompt,
      negativePrompt,
      path.join(OUTPUT_DIR, 'azure', `${scene.label}.png`),
    );
    const geminiResult = await tryGenerate(
      gemini,
      references.map((r) => r.img),
      prompt,
      negativePrompt,
      path.join(OUTPUT_DIR, 'gemini', `${scene.label}.png`),
    );

    entries.push({
      sceneLabel: scene.label,
      scenePrompt: scene.scenePrompt,
      ...(azureResult ? { azure: azureResult } : {}),
      ...(geminiResult ? { gemini: geminiResult } : {}),
    });
  }

  await writeReport(OUTPUT_DIR, entries, referencePaths);
  console.info(`\nReport written: ${path.join(OUTPUT_DIR, 'report.html')}`);
}

async function tryGenerate(
  provider: ImageProvider,
  refs: ReferenceImage[],
  prompt: string,
  negativePrompt: string,
  outPath: string,
): Promise<NonNullable<ReportEntry['azure']> | undefined> {
  try {
    const result = await provider.generate({
      prompt,
      negativePrompt,
      referenceImages: refs,
      aspectRatio: '3:4',
      ctx: { userId: 'sprint-0' },
    });
    await fs.writeFile(outPath, result.bytes);
    console.info(`  ${provider.id}: ${result.latencyMs} ms, ${result.costCents}c → ${outPath}`);
    return { imagePath: outPath, latencyMs: result.latencyMs, costCents: result.costCents };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ${provider.id}: FAILED — ${message}`);
    return { imagePath: '', latencyMs: 0, costCents: 0, error: message };
  }
}

async function loadReferences(): Promise<{ path: string; img: ReferenceImage }[]> {
  await fs.mkdir(INPUT_DIR, { recursive: true });
  const files = await fs.readdir(INPUT_DIR);
  const jpegs = files.filter((f) => /^reference-\d+\.(jpe?g|png)$/i.test(f)).sort();
  const loaded: { path: string; img: ReferenceImage }[] = [];
  for (const f of jpegs) {
    const full = path.join(INPUT_DIR, f);
    const bytes = await fs.readFile(full);
    const mimeType: 'image/png' | 'image/jpeg' = f.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    loaded.push({ path: full, img: { bytes, mimeType } });
  }
  return loaded;
}

function requireEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}. Copy .env.example to .env and fill in.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
