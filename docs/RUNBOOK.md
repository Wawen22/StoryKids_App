# Runbook

Operational playbook for StoryKids. Covers local dev bootstrap, prod deploy, and incident response.

## Local dev bootstrap

1. **Install tooling**
   ```bash
   nvm use                                  # reads .nvmrc → Node 24.15.0
   corepack enable && corepack prepare pnpm@latest --activate
   pnpm install
   ```

2. **Create `.env`**
   ```bash
   cp .env.example .env
   ```
   Fill in: Azure OpenAI key + endpoint + deployment name, Gemini key, OpenRouter key, Supabase project URL + keys + JWT secret, R2 credentials, RevenueCat secret. See `.env.example` for the full list.

3. **Start local infra**
   ```bash
   pnpm docker:up                           # postgres 16 + redis 7
   pnpm db:generate
   pnpm db:migrate
   ```

4. **Run Sprint 0 experiment (before anything else)**
   ```bash
   # Put 1–2 reference photos in experiments/face-consistency-test/input/
   pnpm experiment:face-consistency
   open experiments/face-consistency-test/output/report.html
   ```

5. **Start API + worker**
   ```bash
   pnpm api:dev        # terminal 1
   pnpm api:worker     # terminal 2
   ```

## Production deploy

- **API + worker:** Railway services, one per process. Pushes to `main` → Railway auto-deploys after CI green.
- **Database:** Supabase managed Postgres. Migrations applied via `prisma migrate deploy` as a Railway release phase.
- **Redis:** Upstash. Provisioned once; `REDIS_URL` in Railway env.
- **R2 bucket:** Created manually. Public bucket for generated images (behind Cloudflare CDN). Private bucket for child photos (presigned URLs only).
- **Mobile:** Codemagic builds from tagged commits (`v*.*.*`). TestFlight + Play Internal Testing first, then staged rollout.

## Secret rotation

- **Supabase JWT secret:** rotate yearly or after any suspected leak. Requires flushing all active sessions (users re-login).
- **R2 keys:** rotate every 90 days. Zero downtime via overlap window.
- **AI provider keys:** rotate quarterly. Script in `infra/scripts/rotate-keys.sh` (TBD).

## Incident playbooks

### Photo leak suspected
1. Revoke the R2 access key in Cloudflare dashboard.
2. Provision new R2 creds, redeploy API + worker.
3. Query `ChildPhoto` for affected window, force-delete objects regardless of `expiresAt`.
4. Notify affected users within 72 h (GDPR Art. 33).
5. File post-mortem in `docs/incidents/YYYY-MM-DD-<slug>.md`.

### AI provider outage
1. Flip tier routing in `ProviderRegistry` via env flag (`AI_IMAGE_PROVIDER_OVERRIDE=gemini`).
2. Redeploy worker (config-only, <30 s).
3. Monitor error rate in Sentry until stable.

### Cost spike
1. Check `AiCallLog` last 1 h grouped by user.
2. If single user spiked: lower their per-user cap in DB (ad-hoc column TBD or feature flag).
3. If global: identify runaway job, cancel via BullMQ admin, patch worker.

### Stuck jobs
1. `pnpm --filter @storykids/api exec bullmq-dashboard` (when wired).
2. Inspect failed reason. Jobs older than 1 h in `active` state → likely a crashed worker; bounce it.

## Useful commands

```bash
pnpm typecheck                   # all TS
pnpm lint                        # ESLint
pnpm test                        # all tests
pnpm --filter @storykids/api run db:studio   # Prisma Studio
pnpm --filter @storykids/api run db:reset    # DESTRUCTIVE — local only
```
