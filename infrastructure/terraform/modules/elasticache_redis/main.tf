# ElastiCache Redis 7 Module - OpsPilot AI
# Managed Redis cluster for BullMQ asynchronous job queues and rate limiting

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.environment}-opspilot-redis"
  description          = "Redis 7 replication group for OpsPilot AI ${var.environment}"

  engine         = "redis"
  engine_version = var.engine_version
  node_type      = var.node_type
  port           = 6379

  parameter_group_name = "default.redis7"
  subnet_group_name    = var.subnet_group_name
  security_group_ids   = [var.security_group_id]

  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1 ? true : false
  multi_az_enabled           = var.num_cache_clusters > 1 ? true : false

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.auth_token

  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:03:30-sun:04:30"
  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-redis"
  })
}
