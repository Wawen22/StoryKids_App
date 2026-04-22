FROM node:24.15.0-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm --filter @storykids/shared-types build \
 && pnpm --filter @storykids/ai-providers build \
 && pnpm --filter @storykids/prompt-library build \
 && pnpm --filter @storykids/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/server.js"]
