# Next steps — unblock guide + handoff to next session

Self-contained handoff for the next Claude Code session. The repo scaffold is committed (`7ded00b`); before any further implementation work can happen, **the blockers in §1 must be resolved by a human**.

If you are the next Claude Code session: read [`AGENTS.md`](AGENTS.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/superpowers/specs/2026-04-22-storykids-mvp-design.md`](docs/superpowers/specs/2026-04-22-storykids-mvp-design.md) first, then come back here.

---

## 1. Blockers (human action required)

| # | Blocker | Owner | Unblocks |
|---|---|---|---|
| B1 | **Rotate 2 leaked API keys** (OpenRouter + Azure Foundry) that were pasted in chat in the previous session | User | `.env` creation → everything else |
| B2 | Provide **Azure endpoint URL** + **deployment name** for `gpt-image-2` | User | Sprint 0 script + API image provider |
| B3 | Drop **mockup screenshots** into [`docs/mockups/`](docs/mockups/) | User | Flutter UI work |
| B4 | Put **1–2 reference photos** in [`experiments/face-consistency-test/input/`](experiments/face-consistency-test/input/) as `reference-1.jpg` (and optionally `reference-2.jpg`) | User | Sprint 0 experiment run |
| B5 | Create external accounts **when ready for prod**: Supabase (EU region), Cloudflare R2 bucket, Upstash Redis, RevenueCat, Railway, Sentry, PostHog (EU cloud) | User | Deploying Sprint 1 end-to-end |

### B1 — How to rotate the leaked keys

**OpenRouter** — `sk-or-v1-6bc148…` (leaked in previous chat)
1. Go to <https://openrouter.ai/settings/keys>
2. Click **Revoke** next to the leaked key.
3. Click **Create Key**, name it `storykids-dev` (restrict scope if the UI allows).
4. Copy the new key → you will paste it into `.env` in step §2.

**Azure Foundry / OpenAI** — `4dAlUiNo…mnyT` (leaked in previous chat)
1. Open the Azure Portal → your OpenAI resource (e.g. `rsrc-gpt-5-codex`).
2. *Resource Management → Keys and Endpoint* → click **Regenerate Key 1**.
3. Copy the new key + the **Endpoint** URL shown on that page.
4. *Resource Management → Model deployments* → note the **Deployment name** used for `gpt-image-2`.

### B2 — What you need to capture from Azure

- `AZURE_OPENAI_ENDPOINT` — the resource URL, e.g. `https://rsrc-xxx.openai.azure.com/openai/v1`
- `AZURE_OPENAI_API_KEY` — the newly-regenerated key from B1
- `AZURE_OPENAI_IMAGE_DEPLOYMENT` — your deployment name (probably `gpt-image-2`, but verify)

### B3 — Mockups

Drop the PNGs (or PDFs) you mentioned in `docs/mockups/`. Name them by screen, e.g. `01-welcome.png`, `02-child-details.png`, `03-photo-upload.png`, `04-theme-picker.png`, `05-art-style.png`, `06-generating.png`, `07-preview-paywall.png`.

### B4 — Reference photos for Sprint 0

- Use a real child photo (with guardian consent) **or** a stock photo (e.g. <https://www.pexels.com/search/child%20portrait/>) for testing.
- Name the file `reference-1.jpg` exactly. Optionally add `reference-2.jpg` for a second angle — some providers handle multi-reference better.
- Image should be a clear, front-facing portrait, at least 512 × 512 px, under 4 MB.

### B5 — External accounts (deferrable)

Only blocks prod. Sprint 0 and local dev do **not** need these — you can go pretty far with just B1–B4.

---

## 2. Bootstrap after blockers are clear

```bash
cd /home/rnebili/Progetti/NEB/Projects/storykids_app

# 1. Node + pnpm
nvm use                                          # reads .nvmrc → 24.15.0
corepack enable && corepack prepare pnpm@latest --activate

# 2. Install (first run ~3–5 min, ~800 MB)
pnpm install

# 3. Secrets — fill in with rotated keys + Azure endpoint
cp .env.example .env
cp experiments/face-consistency-test/.env.example experiments/face-consistency-test/.env
cp apps/api/.env.example apps/api/.env
# edit the three files; minimum required for Sprint 0:
#   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_IMAGE_DEPLOYMENT,
#   GEMINI_API_KEY (create one: https://aistudio.google.com/apikey)
```

---

## 3. Sprint 0 — face consistency experiment (MUST pass before Sprint 1)

```bash
# Make sure you have at least reference-1.jpg in the input folder
ls experiments/face-consistency-test/input/

# Run
pnpm experiment:face-consistency

# Review (opens in your browser)
open experiments/face-consistency-test/output/report.html   # macOS
# xdg-open on Linux, start on Windows
```

**Acceptance:** median human score ≥ 4/5 on **at least one** provider, across both axes (identity + style).
**If it fails on both:** stop, open a new session, and ask Claude to draft the LoRA/Flux-Dev fallback plan.

Save the filled-in report + scores into `docs/sprint-0-results/<date>/report.html` and commit.

---

## 4. "Cosa fare prossimo turno, quando sbloccato"

Hand this section verbatim to the next Claude Code session as the first task list. Every item references a file path in this repo so the session can pick up cold.

### Phase A — local dev stack operational

1. **Start infra**
   ```bash
   pnpm docker:up
   pnpm --filter @storykids/api db:generate
   pnpm --filter @storykids/api db:migrate -- --name init
   ```
2. **Write the initial Supabase RLS migration** — raw SQL in `infra/supabase/migrations/0001_rls_init.sql`, covering every user-scoped table per [`infra/supabase/policies/README.md`](infra/supabase/policies/README.md). Apply via Supabase CLI or the Supabase SQL editor in the hosted project.
3. **Close the R2 download gap** — implement `loadChildReferences` in [`apps/api/src/worker/story-job.ts:158`](apps/api/src/worker/story-job.ts). It currently returns `[]` so no reference images reach the image provider. Needs a `GetObjectCommand` + stream→Buffer helper in [`apps/api/src/lib/r2.ts`](apps/api/src/lib/r2.ts).
4. **Azure reference-image pipeline** — [`packages/ai-providers/src/providers/azure-image.ts`](packages/ai-providers/src/providers/azure-image.ts) currently only uses `images.generate`. Switch to whichever Azure endpoint supports reference images for gpt-image-2 (likely `/edits` or a variation endpoint; verify via Microsoft Learn MCP: `microsoft_docs_search("gpt-image-2 reference image")`).

### Phase B — API hardening

5. **Integration tests** for: auth middleware, paywall locking (`serializeStory` in [`apps/api/src/routes/stories.ts`](apps/api/src/routes/stories.ts)), RevenueCat webhook signature, photo-sweeper TTL (48 h boundary).
6. **RLS policy tests** — scaffold `apps/api/test/rls/*.test.ts` hitting a dedicated Supabase test project.
7. **Subscription state machine tests** — grace period, cancellation, refund, upgrade.
8. **Sentry wiring** in [`apps/api/src/server.ts`](apps/api/src/server.ts) + worker entrypoint. Keep error payloads free of child data (see [`docs/PRIVACY.md`](docs/PRIVACY.md)).

### Phase C — Flutter (only after B3 mockups arrive)

9. Bootstrap per [`apps/mobile/README.md`](apps/mobile/README.md): `flutter create . --project-name storykids --org ai.storykids --empty`, add the locked dep list, register the project in [`melos.yaml`](melos.yaml).
10. Implement theme tokens (cream `#FBF5EA`, aubergine `#2D1B3D`, terracotta `#C9663F`, amber `#F3D5A7`) + Fraunces + Manrope via `google_fonts`.
11. Build the 7 Sprint 1 screens in order (welcome → preview+paywall). Each screen must match its mockup pixel-precisely. Flag any mockup/product-doc contradiction before coding.
12. Wire `dio` with a Supabase JWT interceptor + `purchases_flutter` (RevenueCat) + client-side photo compression before presigned PUT.

### Phase D — deploy smoke test

13. Provision Railway project (one service for API, one for worker, both pointing at the same Supabase DB). Bind env vars from Doppler or Railway secrets.
14. Tag `v0.1.0`, verify the Dockerfile builds both services, run a full E2E: signup → child → upload → story generation → preview → paywall → RevenueCat sandbox purchase → unlock.

---

## 5. Reference — existing repo anchors

| What | Where |
|---|---|
| Product canon | [`StoryKids_AI_Product_Doc.md`](StoryKids_AI_Product_Doc.md) |
| Agent rules | [`AGENTS.md`](AGENTS.md) |
| Architecture | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Privacy + GDPR | [`docs/PRIVACY.md`](docs/PRIVACY.md) |
| Ops runbook | [`docs/RUNBOOK.md`](docs/RUNBOOK.md) |
| Design spec | [`docs/superpowers/specs/2026-04-22-storykids-mvp-design.md`](docs/superpowers/specs/2026-04-22-storykids-mvp-design.md) |
| Sprint 0 script | [`experiments/face-consistency-test/src/index.ts`](experiments/face-consistency-test/src/index.ts) |
| Prisma schema | [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) |
| AI provider abstraction | [`packages/ai-providers/src/types.ts`](packages/ai-providers/src/types.ts) |

## 6. Known debts flagged in code (not forgotten)

- `apps/api/src/worker/story-job.ts` — `loadChildReferences` returns `[]`; needs R2 download helper.
- `packages/ai-providers/src/providers/azure-image.ts` — comment explains reference images aren't wired through `images.generate`; Sprint 0 will determine the right Azure endpoint.
- `infra/supabase/policies/` — README only, SQL policies TBD.
- `apps/api/src/routes/me.ts` — `POST /v1/me/export` enqueues nothing yet (returns 202 stub); real export job in Sprint 2.

Last updated: 2026-04-22
