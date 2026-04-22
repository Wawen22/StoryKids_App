# Supabase RLS policies

All user-scoped tables enforce `user_id = auth.uid()` at the database layer. Policies live as SQL files next to this README and are applied via `prisma migrate deploy` (the Prisma schema is authoritative for structure; RLS is a raw-SQL migration on top).

## Required policies (Sprint 1)

- `users`: a user can SELECT/UPDATE their own row; no INSERT (created via Supabase Auth trigger).
- `children`, `child_photos`, `stories`, `story_pages`, `subscriptions`, `ai_call_logs`: full CRUD limited to `user_id = auth.uid()`.
- Service role bypasses RLS — used exclusively by the Fastify server and BullMQ worker.

## Tests

Policy tests live in `apps/api/test/rls/*.test.ts`. They use a dedicated Supabase test project and assert that:

- A logged-in user cannot read another user's stories.
- A logged-in user cannot insert rows with a different `user_id`.
- Anonymous requests are denied on every protected table.
