# Security Groups Module - OpsPilot AI
# Strict least-privilege network isolation between tiers

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# ------------------------------------------------------------------------------
# 1. Application Load Balancer Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.environment}-opspilot-alb-sg"
  description = "Controls public inbound traffic to Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP public ingress (for HTTPS redirection)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS public ingress"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Egress to application tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-alb-sg"
  })
}

# ------------------------------------------------------------------------------
# 2. Node.js API ECS Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "ecs_api" {
  name        = "${var.environment}-opspilot-ecs-api-sg"
  description = "Inbound from ALB only, egress to internal services and databases"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound API traffic from ALB only"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound to VPC services and external endpoints"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-ecs-api-sg"
  })
}

# ------------------------------------------------------------------------------
# 3. Python AI Microservice ECS Security Group (Internal Only)
# ------------------------------------------------------------------------------
resource "aws_security_group" "ecs_ai" {
  name        = "${var.environment}-opspilot-ecs-ai-sg"
  description = "Restricted internal AI microservice - NO direct public access"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Inbound AI invocation from Node.js API tasks only"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_api.id]
  }

  egress {
    description = "Outbound to RDS, Redis, and OpenAI API (via NAT/HTTPS)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-ecs-ai-sg"
  })
}

# ------------------------------------------------------------------------------
# 4. Background Workers Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "ecs_workers" {
  name        = "${var.environment}-opspilot-ecs-workers-sg"
  description = "Security group for BullMQ background workers"
  vpc_id      = var.vpc_id

  # Workers receive no inbound traffic (pull model from Redis queue)
  egress {
    description = "Outbound to Redis, RDS, S3, and AI Service"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-ecs-workers-sg"
  })
}

# Allow workers to invoke AI service internally on port 8000
resource "aws_security_group_rule" "ai_from_workers" {
  type                     = "ingress"
  description              = "Allow worker tasks to call AI service internally"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs_workers.id
  security_group_id        = aws_security_group.ecs_ai.id
}

# ------------------------------------------------------------------------------
# 5. Migration Runner Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "migration_runner" {
  name        = "${var.environment}-opspilot-migration-runner-sg"
  description = "Ephemeral migration tasks connecting to RDS"
  vpc_id      = var.vpc_id

  egress {
    description = "Outbound to RDS on port 5432"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-migration-runner-sg"
  })
}

# ------------------------------------------------------------------------------
# 6. RDS PostgreSQL Database Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.environment}-opspilot-rds-sg"
  description = "Restricted ingress to PostgreSQL 16 on port 5432"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow PostgreSQL access from Node.js API tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_api.id]
  }

  ingress {
    description     = "Allow PostgreSQL access from Python AI tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_ai.id]
  }

  ingress {
    description     = "Allow PostgreSQL access from background workers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_workers.id]
  }

  ingress {
    description     = "Allow PostgreSQL access from one-off migration tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.migration_runner.id]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-rds-sg"
  })
}

# ------------------------------------------------------------------------------
# 7. ElastiCache Redis Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name        = "${var.environment}-opspilot-redis-sg"
  description = "Restricted ingress to Redis on port 6379"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Redis access from Node.js API tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_api.id]
  }

  ingress {
    description     = "Allow Redis access from Python AI tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_ai.id]
  }

  ingress {
    description     = "Allow Redis access from BullMQ background workers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_workers.id]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-redis-sg"
  })
}
