# Production Environment Composition - OpsPilot AI
# High-availability Multi-AZ architecture with automated failover and deletion protection

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

  # Remote backend configuration (uncomment after running bootstrap)
  # backend "s3" {
  #   bucket         = "opspilot-terraform-state-REPLACE_ACCOUNT_ID"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "opspilot-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "OpsPilot AI"
      ManagedBy   = "Terraform"
    }
  }
}

locals {
  tags = {
    Environment = var.environment
    Project     = "OpsPilot AI"
    ManagedBy   = "Terraform"
  }
}

# ------------------------------------------------------------------------------
# 1. VPC & Networking (Multi-AZ NAT Gateways for High Availability)
# ------------------------------------------------------------------------------
module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = "10.0.0.0/16"
  az_count           = 3
  single_nat_gateway = false # 1 NAT Gateway per AZ
  tags               = local.tags
}

# ------------------------------------------------------------------------------
# 2. Security Groups
# ------------------------------------------------------------------------------
module "security_groups" {
  source = "../../modules/security_groups"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  tags        = local.tags
}

# ------------------------------------------------------------------------------
# 3. S3 Frontend Hosting & CloudFront OAC
# ------------------------------------------------------------------------------
module "s3_frontend" {
  source = "../../modules/s3_frontend"

  environment         = var.environment
  custom_domain       = var.frontend_domain
  acm_certificate_arn = var.frontend_certificate_arn
  price_class         = "PriceClass_All"
  force_destroy       = false
  tags                = local.tags
}

# ------------------------------------------------------------------------------
# 4. S3 Private Document Storage
# ------------------------------------------------------------------------------
module "s3_documents" {
  source = "../../modules/s3_documents"

  environment   = var.environment
  force_destroy = false
  tags          = local.tags
}

# ------------------------------------------------------------------------------
# 5. RDS PostgreSQL 16 (Multi-AZ with Deletion Protection)
# ------------------------------------------------------------------------------
module "rds_postgres" {
  source = "../../modules/rds_postgres"

  environment             = var.environment
  engine_version          = "16.4"
  instance_class          = var.rds_instance_class
  allocated_storage       = 100
  max_allocated_storage   = 500
  database_name           = "opspilot_db"
  admin_username          = "opspilot_admin"
  admin_password          = module.secrets.postgres_admin_password
  db_subnet_group_name    = module.vpc.db_subnet_group_name
  security_group_id       = module.security_groups.rds_security_group_id
  multi_az                = true
  deletion_protection     = true
  skip_final_snapshot     = false
  backup_retention_period = 30
  tags                    = local.tags
}

# ------------------------------------------------------------------------------
# 6. ElastiCache Redis 7 (Multi-Cluster Replication with Auto-Failover)
# ------------------------------------------------------------------------------
module "elasticache_redis" {
  source = "../../modules/elasticache_redis"

  environment              = var.environment
  engine_version           = "7.1"
  node_type                = var.redis_node_type
  num_cache_clusters       = 2
  auth_token               = module.secrets.redis_auth_token
  subnet_group_name        = module.vpc.redis_subnet_group_name
  security_group_id        = module.security_groups.redis_security_group_id
  snapshot_retention_limit = 7
  tags                     = local.tags
}

# ------------------------------------------------------------------------------
# 7. Secrets Manager
# ------------------------------------------------------------------------------
module "secrets" {
  source = "../../modules/secrets"

  environment                = var.environment
  db_host                    = module.rds_postgres.address
  db_port                    = module.rds_postgres.port
  db_name                    = module.rds_postgres.database_name
  redis_host                 = module.elasticache_redis.primary_endpoint_address
  redis_port                 = module.elasticache_redis.port
  openai_api_key_placeholder = var.openai_api_key
  tags                       = local.tags
}

# ------------------------------------------------------------------------------
# 8. IAM Roles & GitHub Actions OIDC
# ------------------------------------------------------------------------------
module "iam" {
  source = "../../modules/iam"

  environment          = var.environment
  documents_bucket_arn = module.s3_documents.bucket_arn
  github_repo          = var.github_repo
  create_oidc_provider = var.create_oidc_provider
  tags                 = local.tags
}

# ------------------------------------------------------------------------------
# 9. Application Load Balancer
# ------------------------------------------------------------------------------
module "alb" {
  source = "../../modules/alb"

  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  public_subnet_ids          = module.vpc.public_subnet_ids
  security_group_id          = module.security_groups.alb_security_group_id
  acm_certificate_arn        = var.api_certificate_arn
  enable_deletion_protection = true
  tags                       = local.tags
}

# ------------------------------------------------------------------------------
# 10. CloudWatch Logging & Alarms
# ------------------------------------------------------------------------------
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  environment                 = var.environment
  log_retention_days          = 90
  ecs_cluster_name            = module.ecs.cluster_name
  api_service_name            = module.ecs.api_service_name
  ai_service_name             = module.ecs.ai_service_name
  alb_arn_suffix              = module.alb.alb_arn
  alb_target_group_arn_suffix = module.alb.api_target_group_arn
  rds_identifier              = "${var.environment}-opspilot-postgres"
  tags                        = local.tags
}

# ------------------------------------------------------------------------------
# 11. ECS Fargate Microservices
# ------------------------------------------------------------------------------
module "ecs" {
  source = "../../modules/ecs"

  environment                    = var.environment
  aws_region                     = var.aws_region
  vpc_id                         = module.vpc.vpc_id
  application_subnet_ids         = module.vpc.application_subnet_ids
  api_security_group_id          = module.security_groups.ecs_api_security_group_id
  ai_security_group_id           = module.security_groups.ecs_ai_security_group_id
  workers_security_group_id      = module.security_groups.ecs_workers_security_group_id
  api_target_group_arn           = module.alb.api_target_group_arn
  documents_bucket_name          = module.s3_documents.bucket_id
  ecs_execution_role_arn         = module.iam.ecs_execution_role_arn
  ecs_api_task_role_arn          = module.iam.ecs_api_task_role_arn
  ecs_ai_task_role_arn           = module.iam.ecs_ai_task_role_arn
  ecs_workers_task_role_arn      = module.iam.ecs_workers_task_role_arn
  migration_runner_task_role_arn = module.iam.migration_runner_task_role_arn
  api_secrets_arn                = module.secrets.api_secrets_arn
  ai_secrets_arn                 = module.secrets.ai_secrets_arn
  api_image                      = var.api_image
  ai_image                       = var.ai_image
  api_cpu                        = var.api_cpu
  api_memory                     = var.api_memory
  ai_cpu                         = var.ai_cpu
  ai_memory                      = var.ai_memory
  worker_cpu                     = "1024"
  worker_memory                  = "2048"
  api_desired_count              = var.api_desired_count
  api_min_count                  = 2
  api_max_count                  = 10
  ai_desired_count               = var.ai_desired_count
  worker_desired_count           = 2
  api_log_group_name             = module.cloudwatch.api_log_group_name
  ai_log_group_name              = module.cloudwatch.ai_log_group_name
  worker_log_group_name          = module.cloudwatch.worker_log_group_name
  migration_log_group_name       = module.cloudwatch.migration_log_group_name
  enable_container_insights      = true
  tags                           = local.tags
}
