# Privacy & GDPR

StoryKids AI processes photographs of children. This document defines how we handle that data. Every engineer (human or AI) must read and follow it.

## Legal basis

- **Parental consent** is the sole legal basis for processing a child's image (GDPR Art. 6(1)(a) + Art. 8 for minors). The consent screen on first launch captures this.
- **Data controller:** the account holder (parent). We are the processor.
- **Data residency:** EU-only. Supabase project is in Frankfurt, R2 in an EU region, Azure OpenAI in West Europe.

## Data categories

| Category | Source | Storage | Retention |
|---|---|---|---|
| Account email | Supabase Auth | Supabase Postgres | Until account deletion |
| Child name + age | User input | Supabase Postgres | Until account deletion |
| **Child photos** | User upload | **Cloudflare R2** | **48 h** — hard deleted by sweeper |
| Generated story images | AI provider | Cloudflare R2 | Until user deletes story |
| AI call logs | Internal | Supabase Postgres | 90 days, then purged |
| Analytics events | PostHog | PostHog EU | 365 days |

## Photo lifecycle (the critical path)

1. **Client-side compression.** Flutter resizes to max 1024 px longest edge and re-encodes as JPEG q85 before any network call.
2. **Presigned PUT.** API issues a short-lived (15 min) R2 presigned URL scoped to `users/{userId}/children/{childId}/{uuid}.jpg`. Direct upload — bytes never touch our server.
3. **Record in DB.** `ChildPhoto` row stores the R2 key and `expiresAt = now() + 48h`.
4. **AI use.** The worker fetches photos from R2 when generating images.
5. **Sweeper.** A BullMQ repeatable job every hour queries `ChildPhoto WHERE expiresAt < now() AND deletedAt IS NULL`, deletes the R2 object, and sets `deletedAt`.
6. **No backups.** The R2 bucket has versioning disabled. Once deleted, it's gone.

If a story fails generation and the user retries, the photos are still there (within the 48 h window). After 48 h, the user must re-upload.

## User rights (GDPR endpoints)

- `POST /v1/me/export` — returns a ZIP with: account metadata, children records, stories, page texts, and presigned URLs for all generated images. Response is async (job id + download link).
- `DELETE /v1/me` — hard-deletes every row belonging to the user from Postgres (`User` cascades to `Child`, `Story`, `StoryPage`, `Subscription`, `ChildPhoto`), then purges every R2 object under `users/{userId}/`. Irreversible. Soft-delete grace period: 7 days (a background job does the actual purge).

Both endpoints return within 7 days as required by GDPR Art. 15 and 17.

## What analytics never sees

- The child's name
- The child's age (only age bucket, e.g. `3-5`, `6-8`)
- The child's photo
- The account email
- Any IP address (we strip before sending to PostHog)

PostHog `distinct_id` is `sha256(userId + APP_SALT)`. No join key leaks PII outside our DB.

## Subprocessors (disclosed in privacy policy)

| Vendor | Purpose | Data shared |
|---|---|---|
| Supabase | Auth + Postgres | Email, child records (no photos) |
| Cloudflare R2 | Photo + image storage | Child photos (48 h), generated images |
| Azure OpenAI | Image generation (paid tier) | Child photo (reference), scene prompt |
| Google Gemini | Image generation (free tier) | Child photo (reference), scene prompt |
| OpenRouter / OpenAI | Text generation | Child name + age + theme (text only, no photos) |
| RevenueCat | Subscription management | User id, purchase data |
| Sentry | Error tracking | Error stack + user id (no payload bodies) |
| PostHog | Product analytics | Hashed user id + events (no PII) |

## Incident response

- Any suspected leak of a child's photo → immediate rotation of R2 keys + user notification within 72 h (GDPR Art. 33).
- `docs/RUNBOOK.md` has the step-by-step.

## Review cadence

This doc is reviewed every quarter and after every production incident.
