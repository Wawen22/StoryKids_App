# StoryKids AI APP (Android + iOS)

Personalized illustrated storybooks where the child's own face becomes the protagonist. Flutter mobile app + Node/Fastify backend + Supabase + Cloudflare R2.

**Product doc:** [`StoryKids_AI_Product_Doc.md`](StoryKids_AI_Product_Doc.md)
**Operating rules for AI agents:** [`AGENTS.md`](AGENTS.md)
**Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
**Privacy & GDPR:** [`docs/PRIVACY.md`](docs/PRIVACY.md)
**Runbook:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

---

## Repo layout

```
.
├── apps/
│   ├── api/                     Fastify backend + Prisma + BullMQ worker
│   └── mobile/                  Flutter app (scaffolded once mockups arrive)
├── packages/
│   ├── shared-types/            TS types shared across api + web
│   ├── ai-providers/            Provider-agnostic AI abstraction (image + text)
│   └── prompt-library/          Versioned prompts as code
├── experiments/
│   └── face-consistency-test/   Sprint 0 gate — de-risks face consistency
├── infra/
│   ├── supabase/                SQL migrations + RLS policies
│   └── docker/                  docker-compose.dev.yml for local Postgres/Redis
├── docs/
│   └── superpowers/specs/       Design specs (one per feature)
└── .github/workflows/           CI
```

---

## Quick start

**Prerequisites**

- Node.js **24.15.0** LTS (`nvm use` reads `.nvmrc`)
- pnpm **10+** (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for local Postgres + Redis)
- Flutter **3.27+** + Dart **3.6+** (mobile only)
- An `.env` file populated from `.env.example` (see [`docs/RUNBOOK.md`](docs/RUNBOOK.md))

**Install**

```bash
pnpm install
cp .env.example .env       # fill in secrets, NEVER commit
pnpm docker:up             # local Postgres + Redis
pnpm db:generate           # generate Prisma client
pnpm db:migrate            # apply migrations
```

**Sprint 0 — face-consistency experiment (run this first)**

```bash
pnpm experiment:face-consistency
open experiments/face-consistency-test/output/report.html
```

**Development**

```bash
pnpm api:dev               # Fastify with hot reload
pnpm api:worker            # BullMQ worker (separate process)
```

**Checks**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format
```

---

## Current status

- **2026-04-22** — Monorepo scaffolded. Sprint 0 script ready to run (requires Azure + Gemini keys in `.env`). Flutter app deferred until mockups arrive. See [`docs/superpowers/specs/2026-04-22-storykids-mvp-design.md`](docs/superpowers/specs/2026-04-22-storykids-mvp-design.md).

---

## License

Proprietary. All rights reserved.
