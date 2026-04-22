# StoryKids MVP — Design spec (Sprint 0 + Sprint 1)

**Date:** 2026-04-22
**Status:** Approved for execution (user granted autonomy)
**Supersedes:** inline proposals in `StoryKids_AI_Product_Doc.md` where they conflict

---

## 1. Goal

Ship a Flutter + Fastify MVP that generates a personalized illustrated storybook featuring a child's face within 90 seconds of first photo upload. Three free pages, then paywall to unlock the rest. Markets: IT first, EN/ES/FR/DE architectural support.

## 2. Scope

**In scope (Sprint 1):** Welcome → child details → photo upload → theme → art style → generating → preview+paywall. Backend endpoints for children, stories, RevenueCat webhook. R2 upload with 48 h TTL sweeper. `AiCallLog` cost tracking.

**Out of scope (deferred):** Story reader, library screen, print-on-demand, TTS, multi-lang UI strings, referrals.

**Sprint 0 gate (blocks Sprint 1):** face-consistency experiment on Azure `gpt-image-2` vs Gemini `gemini-2.0-flash-exp-image-generation`. Must produce human-reviewable HTML report.

## 3. Decisions locked (no further discussion)

| # | Decision | Rationale |
|---|---|---|
| D1 | Text gen: **OpenRouter** with `openai/gpt-4o-mini` for prod, `openai/gpt-oss-120b:free` for dev | One billing relationship; cheaper than direct OpenAI for paid tier; free-tier fine for dev, banned in prod (logging policy) |
| D2 | Image gen: **Azure gpt-image-2 (paid)** + **Gemini 2.0 Flash Image (free)** | Both support reference images; Sprint 0 bake-off determines default |
| D3 | No TTS in MVP | Product doc puts audio narration in Phase 2; any TTS work is premature |
| D4 | OpenRouter accessed via the **OpenAI SDK** with `baseURL=https://openrouter.ai/api/v1` | Standard pattern; `@openrouter/sdk` isn't the official integration |
| D5 | `ChildPhoto` is a separate table, not a `String[]` on `Child` | Per-photo expiry and soft-delete tracking impossible with an array |
| D6 | `AiCallLog` table is mandatory from day one | Required by doc § cost control; retrofitting is painful |
| D7 | `packages/ai-providers/` as an isolated workspace package | Sprint 0 experiment and production worker use the *same* adapter code |
| D8 | Provider returns `Buffer`, not URL | R2 upload stays in one place (the worker). Providers never own our storage |
| D9 | Paid-tier OpenRouter models only in prod for text | Free models' ToS typically allow prompt logging for training; GDPR for a children's app can't tolerate that |
| D10 | No Flutter scaffolding until mockups land | Pixel-precise design is a product requirement; guessing wastes work |

## 4. Architecture

See `docs/ARCHITECTURE.md`. Key points:

- API (Fastify) and Worker (BullMQ consumer) are separate processes, separately scaled on Railway.
- All AI calls go through `packages/ai-providers/` → `ProviderRegistry` selects by tier. Callers never import a concrete provider.
- All DB access through Prisma. Supabase RLS enforces user isolation at the DB layer.
- Every HTTP boundary and every queue payload is Zod-validated.

## 5. Data model

See `apps/api/prisma/schema.prisma`. Entities:

- `User` — FK of `auth.users.id` from Supabase.
- `Child` (1 User → N Children).
- `ChildPhoto` (1 Child → N Photos, 48 h TTL).
- `Story` (1 User → N Stories, 1 Child → N Stories). Status: PENDING/GENERATING/READY/FAILED.
- `StoryPage` (1 Story → N Pages, unique by `(storyId, index)`).
- `Subscription` (1 User → 1 Subscription, synced from RevenueCat).
- `AiCallLog` (provider, tokens, cost, latency per call).

## 6. API surface (Sprint 1)

- `POST /v1/children` → create child, return presigned R2 PUT URLs for photos
- `POST /v1/stories` → enqueue generation, return `{ jobId, storyId, estimatedSeconds }`
- `GET /v1/stories/:id` → poll status + (when READY) page list with signed image URLs
- `GET /v1/stories` → list user's stories
- `POST /v1/webhooks/revenuecat` → signed webhook → updates `Subscription`
- `POST /v1/me/export` → async GDPR export
- `DELETE /v1/me` → GDPR hard-delete (7-day grace)
- `GET /v1/health` → liveness

All endpoints Zod-validated in and out. Shared types in `packages/shared-types/`.

## 7. Worker flow

1. Receive `generate-story` job `{ storyId, userId, childId, theme, artStyle, language }`
2. Check `AiCallLog` sum over last 24 h → if over `DAILY_SPEND_CAP_CENTS`, fail job
3. Call `TextProvider.generate(storyPrompt)` → JSON `{ title, pages[] }` (validated with Zod)
4. Update `Story.titleText`, create `N` `StoryPage` rows with `text` + `imagePrompt`
5. Fetch child photos from R2 (only keys not expired)
6. For each page: call `ImageProvider.generate(imagePrompt, refs)` → upload to R2 → write `imageKey` on `StoryPage`
7. Mark `Story.status = READY`
8. All calls written to `AiCallLog` regardless of success

Target total time: < 90 s. If not achievable in Sprint 0 we look at parallelization (generate pages concurrently, N=4) or smaller page count in preview mode.

## 8. Mobile

Blocked on mockups. Once they arrive, scaffold with `flutter create`, wire Riverpod + go_router + theme, implement the 7 screens listed in AGENTS.md §8. Client-side photo compression via `image_picker` + `image` (resize to 1024 px longest edge, JPEG q85) before presigned upload.

## 9. Testing

Blocking in CI:

- `packages/ai-providers/` adapter tests (mocked SDKs)
- `apps/api/` integration tests on critical paths: auth, paywall, webhook signature, photo TTL sweeper
- RLS policy tests
- Subscription state machine

Non-blocking: Flutter widget tests.

## 10. Sprint 0 acceptance criteria

The experiment produces an HTML report where:

- The same child's face is generated in 5 distinct scenes (different backgrounds, actions)
- Both Azure and Gemini outputs are shown side-by-side
- A human rater scores 1-5 on "same child?" and "same style?" per output
- Median score ≥ 4/5 on at least one provider → pass
- Median score < 4/5 on both → fail → escalate to LoRA/Flux fallback proposal

## 11. Sprint 1 timeline

From approval to first demoable E2E: **11 – 15 working days** assuming:

- Secrets ready, accounts created (Supabase, R2, RevenueCat, Railway, Sentry, PostHog)
- Mockups provided by day 3
- Sprint 0 passes by day 3

Risk flags listed in §12.

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Sprint 0 fails on both providers | High | Fallback: LoRA on Flux Dev via Replicate (+1–2 weeks) |
| Mockups delayed | Medium | Start backend + packages work; Flutter blocked cleanly |
| Free-tier model ToS changes | Low | Prod uses paid tier only (D9) |
| Cost overrun | Medium | Daily cap + per-call logging (D6) |
| GDPR non-compliance | High | `PRIVACY.md` policy + export/delete endpoints built in Sprint 1 |
| RevenueCat webhook replay | Medium | Idempotency key = webhook event id; ignore duplicates |

## 13. Open items (require user)

1. **Rotate leaked API keys** (OpenRouter + Azure). Until rotated, no `.env` can be created.
2. **Provide Azure endpoint URL + deployment name** for gpt-image-2 resource.
3. **Provide mockup screenshots** (drop PNGs in `docs/mockups/`).
4. **Create external accounts** when ready: Supabase project (EU region), Cloudflare R2 bucket, RevenueCat project, Railway project, Sentry project, PostHog project (EU cloud).
5. **Apple Developer + Google Play access** when we reach store submission.
