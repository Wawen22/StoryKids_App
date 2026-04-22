import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ReportEntry {
  sceneLabel: string;
  scenePrompt: string;
  azure?: { imagePath: string; latencyMs: number; costCents: number; error?: string };
  gemini?: { imagePath: string; latencyMs: number; costCents: number; error?: string };
}

export async function writeReport(outDir: string, entries: ReportEntry[], referencePaths: string[]): Promise<void> {
  const refsHtml = referencePaths
    .map((p) => `<img src="${path.relative(outDir, p)}" alt="reference" class="ref" />`)
    .join('');

  const rowsHtml = entries
    .map((e) => {
      const cell = (side: ReportEntry['azure']) => {
        if (!side) return `<td class="empty">—</td>`;
        if (side.error) return `<td class="err"><pre>${escape(side.error)}</pre></td>`;
        return `<td>
          <img src="${path.relative(outDir, side.imagePath)}" alt="${e.sceneLabel}" />
          <div class="meta">${side.latencyMs} ms · ${(side.costCents / 100).toFixed(2)}$</div>
        </td>`;
      };
      return `<tr>
        <td class="label">${escape(e.sceneLabel)}<br/><span class="prompt">${escape(e.scenePrompt)}</span></td>
        ${cell(e.azure)}
        ${cell(e.gemini)}
        <td class="score">
          <label>Azure identity <input type="number" min="1" max="5" /></label>
          <label>Azure style <input type="number" min="1" max="5" /></label>
          <label>Gemini identity <input type="number" min="1" max="5" /></label>
          <label>Gemini style <input type="number" min="1" max="5" /></label>
        </td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"><title>Face consistency report</title>
<style>
  :root { --fg: #2d1b3d; --bg: #fbf5ea; --accent: #c9663f; }
  body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 2rem; }
  h1 { font-family: Georgia, serif; }
  .refs { display: flex; gap: 1rem; margin-bottom: 2rem; }
  .refs img { max-height: 160px; border-radius: 8px; border: 2px solid var(--accent); }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 0.75rem; vertical-align: top; }
  th { background: white; }
  td img { max-width: 280px; border-radius: 6px; display: block; }
  .meta { font-size: 0.8rem; color: #666; margin-top: 0.25rem; }
  .label { max-width: 220px; }
  .prompt { font-size: 0.8rem; color: #555; font-style: italic; display: block; margin-top: 0.25rem; }
  .err { color: #b00; font-family: monospace; }
  .empty { color: #aaa; text-align: center; }
  .score { font-size: 0.85rem; }
  .score label { display: block; margin-bottom: 0.25rem; }
  .score input { width: 3rem; }
</style>
</head><body>
<h1>Face consistency — Sprint 0 report</h1>
<p>Generated ${new Date().toISOString()}. Score each image 1–5 (identity + style). Pass threshold: median ≥ 4/5 on at least one provider.</p>

<h2>Reference photos</h2>
<div class="refs">${refsHtml}</div>

<h2>Results</h2>
<table>
  <thead>
    <tr><th>Scene</th><th>Azure gpt-image-2</th><th>Gemini 2.0 Flash Image</th><th>Human score (1–5)</th></tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
</body></html>`;

  await fs.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
