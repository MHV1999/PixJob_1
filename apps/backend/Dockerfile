# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
RUN npm install --workspace=@pixjob/backend --include-workspace-root

# ─── Development ──────────────────────────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/backend
RUN npx prisma generate
CMD ["npm", "run", "dev"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# ─── Production ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./

# Run migrations then start
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

EXPOSE 4000
