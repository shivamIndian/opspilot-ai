# Stage 1: TypeScript Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace manifests for efficient caching
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

RUN npm ci --workspace=@opspilot/api --include-workspace-root

# Copy source code and configuration
COPY apps/api/ ./apps/api/

# Compile TypeScript
RUN npm run build --workspace=@opspilot/api

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime utilities for health checks
RUN apk add --no-cache wget

# Copy package manifests for production install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install only production dependencies
RUN npm ci --workspace=@opspilot/api --omit=dev --include-workspace-root && \
    npm cache clean --force

# Copy compiled JavaScript output and migration artifacts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database/migrations ./apps/api/dist/database/migrations

# Set correct file ownership for unprivileged node user
RUN chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "apps/api/dist/server.js"]
