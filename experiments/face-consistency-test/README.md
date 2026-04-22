# Sprint 0 — Face consistency experiment

**This is the hard gate for the whole product.** If neither provider produces a recognizably-consistent child across 5 scenes in the same style, we stop and design a LoRA/Flux-Dev fallback.

## Setup

1. Install workspace deps from the repo root:
   ```bash
   pnpm install
   ```
2. Create this experiment's `.env`:
   ```bash
   cp experiments/face-consistency-test/.env.example experiments/face-consistency-test/.env
   # fill in AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_IMAGE_DEPLOYMENT, GEMINI_API_KEY
   ```
3. Put 1–2 reference photos of a real child (or a stock photo) in `experiments/face-consistency-test/input/`, named `reference-1.jpg` and optionally `reference-2.jpg`.

## Run

```bash
pnpm experiment:face-consistency
open experiments/face-consistency-test/output/report.html
```

The script:

1. Loads reference photos from `input/`.
2. Generates 5 scenes per provider (Azure gpt-image-2 and Gemini 2.0 Flash Image).
3. Uses the **same** prompts (one per scene) for both providers.
4. Saves each output PNG under `output/<provider>/scene-<n>.png`.
5. Emits `output/report.html` with side-by-side comparison, per-image latency, and per-image cost.

## Acceptance

A human rates each output on two axes, 1–5:

- **Identity preservation:** is this the same child as the reference?
- **Style consistency:** do the 5 scenes look like the same book?

**Pass:** median ≥ 4/5 on at least one provider across both axes.
**Fail:** both providers below threshold → escalate to LoRA/Flux fallback proposal.

Record the scores directly in `report.html` (editable text fields) and commit the filled-in copy to `docs/sprint-0-results/`.
