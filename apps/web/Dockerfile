# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm ci --workspace=@opspilot/web --include-workspace-root

# Copy application source code
COPY apps/web/ ./apps/web/

# Build production bundle
ENV NODE_ENV=production
RUN npm run build --workspace=@opspilot/web

# Stage 2: Production Nginx Server
FROM nginxinc/nginx-unprivileged:alpine AS runner

# Copy custom Nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
