# Stage 1: Build virtual environment with uv
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv from official container image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency definition
COPY apps/ai-service/pyproject.toml ./apps/ai-service/

# Sync production dependencies into virtual environment
WORKDIR /app/apps/ai-service
RUN uv sync --no-dev --no-install-project

# Stage 2: Production Runtime
FROM python:3.11-slim AS runner

WORKDIR /app

# Create unprivileged system user
RUN groupadd -g 10001 opspilot && \
    useradd -u 10001 -g opspilot -s /bin/sh -m opspilot

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built virtual environment from builder stage
COPY --from=builder /app/apps/ai-service/.venv /app/.venv

# Copy AI service application code and migration configurations
COPY apps/ai-service/app /app/app
COPY apps/ai-service/alembic /app/alembic
COPY apps/ai-service/alembic.ini /app/alembic.ini

# Ensure correct file permissions
RUN chown -R opspilot:opspilot /app

USER opspilot

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health/live || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
