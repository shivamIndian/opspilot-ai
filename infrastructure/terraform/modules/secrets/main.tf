# Secrets Manager Module - OpsPilot AI
# Centralized encryption and secret storage with ignore_changes lifecycle

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0.0"
    }
  }
}

# ------------------------------------------------------------------------------
# 1. Random Generators for Initial Bootstrapping Secrets
# ------------------------------------------------------------------------------
resource "random_password" "postgres_admin" {
  length  = 32
  special = false
}

resource "random_password" "api_db" {
  length  = 32
  special = false
}

resource "random_password" "ai_db" {
  length  = 32
  special = false
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

resource "random_password" "jwt_access_secret" {
  length  = 48
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 48
  special = false
}

resource "random_password" "internal_service_token" {
  length  = 48
  special = false
}

# ------------------------------------------------------------------------------
# 2. Database & Infrastructure Credentials Secret
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.environment}/opspilot/db-credentials"
  description = "PostgreSQL and Redis master passwords for OpsPilot AI ${var.environment}"
  kms_key_id  = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    POSTGRES_ADMIN_PASSWORD = random_password.postgres_admin.result
    API_DB_PASSWORD         = random_password.api_db.result
    AI_DB_PASSWORD          = random_password.ai_db.result
    REDIS_AUTH_TOKEN        = random_password.redis_auth.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ------------------------------------------------------------------------------
# 3. Node.js API Microservice Secrets
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "api_secrets" {
  name        = "${var.environment}/opspilot/api"
  description = "Runtime application secrets for Node.js API"
  kms_key_id  = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "api_secrets" {
  secret_id = aws_secretsmanager_secret.api_secrets.id
  secret_string = jsonencode({
    JWT_ACCESS_SECRET         = random_password.jwt_access_secret.result
    JWT_REFRESH_SECRET        = random_password.jwt_refresh_secret.result
    AI_SERVICE_INTERNAL_TOKEN = random_password.internal_service_token.result
    DATABASE_URL              = "postgresql://opspilot_api:${random_password.api_db.result}@${var.db_host}:${var.db_port}/${var.db_name}?schema=app"
    REDIS_URL                 = "redis://:${random_password.redis_auth.result}@${var.redis_host}:${var.redis_port}/0"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ------------------------------------------------------------------------------
# 4. Python AI Microservice Secrets
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "ai_secrets" {
  name        = "${var.environment}/opspilot/ai"
  description = "Runtime application secrets for Python AI service (including OpenAI keys)"
  kms_key_id  = var.kms_key_arn

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "ai_secrets" {
  secret_id = aws_secretsmanager_secret.ai_secrets.id
  secret_string = jsonencode({
    OPENAI_API_KEY            = var.openai_api_key_placeholder
    AI_SERVICE_INTERNAL_TOKEN = random_password.internal_service_token.result
    AI_DATABASE_URL           = "postgresql+asyncpg://opspilot_ai:${random_password.ai_db.result}@${var.db_host}:${var.db_port}/${var.db_name}"
    REDIS_URL                 = "redis://:${random_password.redis_auth.result}@${var.redis_host}:${var.redis_port}/1"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
