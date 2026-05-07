FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

ENV NEXT_PUBLIC_BACKEND_URL=http://backend:3100/api/v1
ENV NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880

RUN pnpm --filter @bhet/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
