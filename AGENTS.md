# AGENTS.md — Operating rules for AI agents on StoryKids

This file governs how Claude Code, Codex, and any other AI agent must work in this repo.
Read it fully **before writing any code**. Treat it as a contract.

### Mandatory reading before any session

| Document | When to read |
|---|---|
| This file (`AGENTS.md`) | Always — first |
| [`CLAUDE.md`](CLAUDE.md) | Always — Claude Code session context and active blockers |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Before **any** Flutter/UI work — colors, fonts, spacing, components |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Before backend or infra work |
| [`docs/superpowers/specs/2026-04-22-storykids-mvp-design.md`](docs/superpowers/specs/2026-04-22-storykids-mvp-design.md) | For data model, API surface, sprint scope |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Before any code that touches user or child data |

---

## 1. Golden rules (never violated)

1. **Never commit secrets.** `.env`, `*.env.local`, `*.pem`, `service-account*.json`, `credentials*.json` are gitignored. Never write literal API keys into any file.
2. **Never skip Sprint 0.** The face-consistency experiment in `experiments/face-consistency-test/` is the hard gate for the whole product. Do not proceed to Sprint 1 until it produces results a human has reviewed.
3. **No `any` / no `@ts-ignore`** without a one-line comment explaining why and a link to a ticket/PR.
4. **No silent `catch`.** Every async op has explicit error handling. Errors are either rethrown, mapped to a domain error, or logged with structured context.
5. **No destructive git/db commands** without explicit user approval. `git reset --hard`, `git push --force`, `DROP TABLE`, `prisma migrate reset` — stop and ask.
6. **Ask before installing deps outside the locked stack** in `docs/ARCHITECTURE.md`.
7. **Never invent API shapes.** When unsure about a library or model, use Context7 or the Microsoft Learn MCP to fetch current docs.
8. **Match mockups pixel-precisely.** Flag discrepancies vs. the product doc or `docs/DESIGN_SYSTEM.md` — never invent requirements.

---

## 2. Stack (locked)

Full rationale in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Short version:

- **Runtime:** Node.js 24 LTS (`.nvmrc` pins `24.15.0`), pnpm 10, TypeScript 5.8 strict.
- **Backend:** Fastify 5, Prisma 6, Zod 3, BullMQ 5, pino.
- **Mobile:** Flutter 3.27+, Dart 3.6+, Riverpod 2.6, go_router 14, dio 5, hive 4, `flutter_secure_storage`, `purchases_flutter` (RevenueCat).
- **Data:** Supabase (Postgres + Auth + RLS), Cloudflare R2, Upstash Redis.
- **AI:** Azure OpenAI `gpt-image-2` (paid image), Gemini 2.0 Flash Image (free image), OpenRouter for text (paid: `openai/gpt-4o-mini`; free dev: `openai/gpt-oss-120b:free`).
- **Monetization:** RevenueCat. Never call StoreKit/Play Billing directly.
- **Observability:** Sentry + PostHog.
- **Hosting:** Railway (api + worker), Codemagic or GitHub Actions + Fastlane (mobile CI/CD).

Any deviation requires an ADR in `docs/adr/` and user sign-off.

---

## 3. Code standards

- **TypeScript:** strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`. Zod validates every external boundary (HTTP, queue payload, webhook body, AI response).
- **Dart:** `flutter analyze` clean. No warnings tolerated in CI.
- **Shared types:** Every API endpoint's request + response shape lives in `packages/shared-types/` and is derived from Zod schemas (`z.infer<typeof schema>`). No duplication.
- **File size:** target ≤ 300 LOC per file. When a file grows larger, extract before continuing.
- **Comments:** only for non-obvious *why*. Never what-comments, never change-log comments ("added for X"), never TODOs without an issue link.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Keep them scoped.
- **Branches:** `feat/<slug>`, `fix/<slug>`. Main is protected once CI is set up.

---

## 4. Privacy & GDPR (non-negotiable — children's data)

See [`docs/PRIVACY.md`](docs/PRIVACY.md) for the full policy.

- Photos flow: client-side compress → **presigned R2 upload** (direct-to-R2, never through our server) → auto-delete after **48 h** via a BullMQ scheduled sweeper → no backups, no replication to analytics.
- `AiCallLog` records every AI call (provider, tokens, cost, latency) for auditability and cost control.
- `POST /v1/me/export` returns a ZIP of the user's data. `DELETE /v1/me` hard-deletes Postgres rows + purges R2 objects. Both endpoints are required for GDPR compliance.
- Consent screen on first mobile launch. Privacy policy link on every screen that collects data.
- No children's data in analytics payloads. PostHog events use a hashed user id, never the child's name or photo.

---

## 5. Cost control

- Every AI call logs `{provider, model, inputTokens, outputTokens, costCents, latencyMs}` via `AiCallLog`.
- Per-user daily spend cap enforced in the BullMQ worker. Dev default `$1`, prod default `$5` (both configurable via `DAILY_SPEND_CAP_CENTS`).
- If the cap is hit, new jobs fail fast with `FAILED` status and a user-visible message. No queueing on exceeded caps.

---

## 6. Testing

**Required** (CI blocks on failure):

- `packages/ai-providers/` — adapter tests with mocked SDKs, verifying request shape + cost/latency reporting.
- `apps/api/` — Fastify integration tests for paywall logic, RevenueCat webhook verification, auth middleware, Zod schema round-trips.
- `infra/supabase/policies/` — RLS policy tests (a user cannot read another user's stories).
- Subscription state machine tests (grace period, refund, cancellation, upgrade).

**Nice to have** (not blocking for MVP):

- Flutter widget tests.
- UI golden tests.

Run locally: `pnpm test`. Mobile: `melos run test`.

---

## 7. Workflow for AI agents

1. **Read** `AGENTS.md` + `CLAUDE.md` + `docs/ARCHITECTURE.md` + `docs/DESIGN_SYSTEM.md` + any relevant design spec in `docs/superpowers/specs/`.
2. Use the **superpowers** flow: `brainstorming` → `writing-plans` → `executing-plans`. No shortcuts.
3. Before any non-trivial change, check for an existing design spec. If absent, write one.
4. For library/API questions use **Context7** or **Microsoft Learn MCP** before coding. Never guess an SDK shape.
5. When a hook/skill suggests a correction, apply it — don't rationalize around it.

---

## 8. Sprint 1 scope (what to build)

Only:

**Backend (`apps/api`):**

- Fastify health check, structured logs, CORS, rate limiting.
- Prisma schema for 7 entities (see `apps/api/prisma/schema.prisma`).
- Supabase Auth JWT verification middleware.
- `POST /v1/children`, `POST /v1/stories`, `GET /v1/stories/:id`, `GET /v1/stories`.
- BullMQ worker: story text via OpenRouter → image per page via Azure/Gemini → R2 upload → DB update.
- RevenueCat webhook (`POST /v1/webhooks/revenuecat`) verifying signature + syncing subscription.
- Every endpoint validated by Zod on input *and* output.

**Mobile (`apps/mobile`) — blocked on mockups:**

1. Welcome
2. Child details (name + age)
3. Photo upload (3–5 photos, client-side compressed)
4. Theme picker (6 themes)
5. Art style picker (4 styles)
6. Generating screen (polls every 3 s)
7. Preview + paywall (3 free pages + locked state)

---

## 9. Sprint 1 **out of scope** (do not build)

- Story reader (pages 8–9 of mockups) — Sprint 2
- Library screen — Sprint 2
- Print-on-demand — Phase 2
- Audio narration / TTS — Phase 2
- Multi-language UI strings — Phase 2 (architecture must *support* i18n, but only `en` shipped)
- Referral / gift cards — Phase 3

---

## 10. Risk flags an agent must raise immediately

- If Sprint 0 does not reach acceptable face consistency within 3 days → stop and discuss LoRA/Flux-Dev fallback.
- If a new dependency is required that isn't in the locked stack → propose it, don't install.
- If an AI provider returns inconsistent cost data → log anyway, flag in a PR.
- If a product-doc requirement contradicts a mockup → stop and ask.
