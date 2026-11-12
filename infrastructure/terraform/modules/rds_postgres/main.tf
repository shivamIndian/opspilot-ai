# RDS PostgreSQL 16 Module - OpsPilot AI
# Production PostgreSQL instance with pgvector extension support

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
# 1. Custom DB Parameter Group for PostgreSQL 16 + pgvector
# ------------------------------------------------------------------------------
resource "aws_db_parameter_group" "postgres16" {
  name        = "${var.environment}-opspilot-postgres16-pg"
  family      = "postgres16"
  description = "Custom parameter group enabling pgvector extension on PostgreSQL 16"

  parameter {
    name  = "shared_preload_libraries"
    value = "vector"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-postgres16-pg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ------------------------------------------------------------------------------
# 2. RDS PostgreSQL Instance
# ------------------------------------------------------------------------------
resource "aws_db_instance" "postgres" {
  identifier     = "${var.environment}-opspilot-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.admin_username
  password = var.admin_password
  port     = 5432

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.security_group_id]
  parameter_group_name   = aws_db_parameter_group.postgres16.name

  multi_az               = var.multi_az
  publicly_accessible    = false
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.environment}-opspilot-postgres-final-snapshot"

  backup_retention_period   = var.backup_retention_period
  backup_window             = "03:00-04:00"
  maintenance_window        = "Sun:04:30-Sun:05:30"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-postgres"
  })
}
