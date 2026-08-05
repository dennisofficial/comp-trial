# ---------- build ----------
FROM oven/bun:1.3.4-alpine AS builder
WORKDIR /app

# Manifests first so the install layer caches independently of source edits.
# Build context is the repo root — the workspace lockfile and packages/db are needed.
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile

COPY packages/db packages/db
COPY apps/api apps/api

RUN bunx turbo build --filter=api
RUN bun install --frozen-lockfile --production

# ---------- runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/packages/db ./packages/db

USER node

# The container owns the deployed port, and this must agree with `http_port` in
# infra/terraform/.../digitalocean.tf. The env schema's 4000 default is for local dev only
# and is never reached here.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
