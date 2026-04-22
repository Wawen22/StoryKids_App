# Architecture

## Goal

Deliver a personalized illustrated storybook featuring a child's face within 90 seconds of first photo upload. Scale to EU markets (IT, EN, ES, FR, DE). Monetize through a freemium funnel: 3-page preview → paywall → subscription + print upsell.

## High-level components

```
┌──────────────────┐        ┌────────────────────────────────────┐
│  Flutter mobile  │ HTTPS  │  Fastify API (Railway)             │
│  (Riverpod +     ├───────▶│  - REST, Zod-validated             │
│   go_router)     │        │  - Supabase JWT auth middleware    │
└──────────────────┘        │  - Enqueue BullMQ jobs             │
         │                  └────────────────────────────────────┘
         │                                │
         │                                ▼
         │                  ┌────────────────────────────────────┐
         │                  │  BullMQ worker (Railway)           │
         │                  │  - Generates story text (OpenRouter)│
         │                  │  - Generates N images (Azure/Gemini)│
         │                  │  - Uploads to R2                    │
         │                  │  - Updates Postgres                 │
         │                  └────────────────────────────────────┘
         │                                │
         │ presigned PUT                  │
         ▼                                ▼
┌──────────────────┐        ┌────────────────────────────────────┐
│ Cloudflare R2    │        │ Supabase Postgres (+ RLS)          │
│ - child photos   │        │ - Users / Children / Stories       │
│   (48 h TTL)     │        │ - Pages / Subscriptions / Logs     │
│ - final images   │        └────────────────────────────────────┘
└──────────────────┘                      ▲
                                          │ webhook
                            ┌──────────────────────────────────┐
                            │ RevenueCat (subscription state)  │
                            └──────────────────────────────────┘
```

## Process split

- **API process** (`apps/api/src/server.ts`): HTTP only. Validates input, enqueues jobs, reads DB, issues presigned URLs. Never calls AI providers synchronously — all generation is async.
- **Worker process** (`apps/api/src/worker/index.ts`): consumes BullMQ queues, calls AI providers, writes results. One worker per concurrency unit. Idempotent by job id.

Deploying them separately (on Railway) means API stays responsive under heavy AI load, and we scale the worker independently.

## Provider abstraction

`packages/ai-providers/` exposes an `ImageProvider` / `TextProvider` interface. Callers depend on the interface; concrete implementations (Azure, Gemini, OpenRouter) are plugged in via a `ProviderRegistry`. Tier routing (`free` vs `paid`) is centralized in the registry — business logic never knows which provider ran.

Why: Sprint 0 is a provider bake-off. If Azure wins for paid and Gemini wins for free, we wire that in the registry; if both fail, we swap to Replicate/Flux without changing a line of domain code.

## Sprint 0 gate

`experiments/face-consistency-test/` uses the same `packages/ai-providers/` abstraction. Same prompt, same reference images, different providers. Output is a side-by-side HTML report. A human judges "is this the same child across 5 scenes in the same style?" — if neither provider passes, we escalate to LoRA/Flux-Dev before scaffolding more.

## Data model

Single source of truth: `apps/api/prisma/schema.prisma`. Supabase RLS policies live in `infra/supabase/policies/`. All user-scoped tables enforce `user_id = auth.uid()` at the database layer.

## Observability

- **Sentry** for errors (both mobile and backend).
- **PostHog** for funnel events (`signup`, `photo_uploaded`, `story_generated`, `paywall_seen`, `paywall_converted`). No PII. User id is hashed.
- **Structured logs** via pino (JSON, one line per event). Log shipping is deferred to post-MVP.

## Security

- Supabase Auth handles identity (email magic link + Apple + Google). Our API trusts only signed JWTs verified against `SUPABASE_JWT_SECRET`.
- R2 uploads use short-lived presigned URLs scoped to the user's folder.
- RevenueCat webhook validates the `Authorization` header against a shared secret.
- No secrets in source. `.env` is gitignored, CI uses encrypted secrets, prod uses Railway env vars.

## Cost control

Every AI call is wrapped by a cost estimator in `packages/ai-providers/src/util/cost.ts` and recorded in `AiCallLog`. The worker checks the user's last-24h spend before each call and fails fast over the cap (`DAILY_SPEND_CAP_CENTS`).

## Why these choices

| Choice | Alternative considered | Why we picked it |
|---|---|---|
| Fastify 5 | Express | First-class TS, 3× throughput, built-in schema compilation against Zod |
| Prisma 6 | Drizzle | Team familiarity, stable migrations, good DX on Postgres |
| BullMQ | SQS / Inngest | Self-hostable on Upstash Redis, zero vendor lock |
| Supabase Auth | Firebase Auth | Postgres-native RLS, EU data residency, same vendor as DB |
| Cloudflare R2 | S3 | Zero egress fees — image-heavy workload would bleed on S3 |
| RevenueCat | Raw StoreKit/Play | Cross-platform, trial logic, webhooks, analytics for free |
| OpenRouter | Direct OpenAI | One billing relationship, free-tier models for dev, easy model swap |
| Azure gpt-image-2 | DALL-E 3 direct | Reference-image support + enterprise SLA + EU region |
| Flutter | React Native | Pixel-precise rendering, single codebase, better perf on low-end Android |

## Locked versions (2026-04-22)

| Tool | Version |
|---|---|
| Node | 24.15.0 LTS |
| pnpm | 10.x |
| TypeScript | 5.8.x |
| Fastify | 5.x |
| Prisma | 6.x |
| Zod | 3.24.x |
| BullMQ | 5.x |
| Flutter | 3.27+ |
| Dart | 3.6+ |

Upgrades require an ADR.
