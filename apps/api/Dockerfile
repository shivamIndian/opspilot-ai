# Stage 1: TypeScript Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install dependencies including TypeScript compiler
RUN npm install

# Copy source code and configuration
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime utilities for health checks
RUN apk add --no-cache wget

# Copy package manifests for production install
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled JavaScript output and migration artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/migrations ./dist/database/migrations

# Secure container by dropping root privileges
USER node

# Expose internal API listening port
EXPOSE 4000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/v1/health || exit 1

# Execute production server entrypoint
CMD ["node", "dist/server.js"]
