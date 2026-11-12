# ECS Fargate Microservices Module - OpsPilot AI
# Multi-container orchestration with Cloud Map internal discovery & autoscaling

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
# 1. ECS Cluster & Service Discovery Namespace
# ------------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-opspilot-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# Private DNS Namespace for Secure Service-to-Service Communication
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "opspilot.internal"
  description = "Private DNS namespace for OpsPilot AI internal microservices"
  vpc         = var.vpc_id

  tags = var.tags
}

resource "aws_service_discovery_service" "ai_service" {
  name = "ai-service"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 2. Node.js API Task Definition & Service
# ------------------------------------------------------------------------------
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.environment}-opspilot-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_api_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true

      portMappings = [
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "4000" },
        { name = "AI_SERVICE_URL", value = "http://ai-service.opspilot.internal:8000" },
        { name = "DOCUMENT_STORAGE_PROVIDER", value = "s3" },
        { name = "AWS_S3_DOCUMENT_BUCKET", value = var.documents_bucket_name },
        { name = "AWS_REGION", value = var.aws_region }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${var.api_secrets_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${var.api_secrets_arn}:REDIS_URL::" },
        { name = "JWT_ACCESS_SECRET", valueFrom = "${var.api_secrets_arn}:JWT_ACCESS_SECRET::" },
        { name = "JWT_REFRESH_SECRET", valueFrom = "${var.api_secrets_arn}:JWT_REFRESH_SECRET::" },
        { name = "AI_SERVICE_INTERNAL_TOKEN", valueFrom = "${var.api_secrets_arn}:AI_SERVICE_INTERNAL_TOKEN::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.api_log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:4000/health/live || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 15
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "api" {
  name            = "${var.environment}-opspilot-api-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.application_subnet_ids
    security_groups  = [var.api_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.api_target_group_arn
    container_name   = "api"
    container_port   = 4000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 3. Python AI Microservice Task Definition & Service (Internal Only)
# ------------------------------------------------------------------------------
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.environment}-opspilot-ai-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ai_cpu
  memory                   = var.ai_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_ai_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "ai-service"
      image     = var.ai_image
      essential = true

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "APP_ENV", value = "production" },
        { name = "APP_PORT", value = "8000" },
        { name = "LOG_LEVEL", value = "INFO" }
      ]

      secrets = [
        { name = "AI_DATABASE_URL", valueFrom = "${var.ai_secrets_arn}:AI_DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${var.ai_secrets_arn}:REDIS_URL::" },
        { name = "OPENAI_API_KEY", valueFrom = "${var.ai_secrets_arn}:OPENAI_API_KEY::" },
        { name = "AI_SERVICE_INTERNAL_TOKEN", valueFrom = "${var.ai_secrets_arn}:AI_SERVICE_INTERNAL_TOKEN::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.ai_log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ai"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health/live || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 20
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "ai_service" {
  name            = "${var.environment}-opspilot-ai-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_service.arn
  desired_count   = var.ai_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.application_subnet_ids
    security_groups  = [var.ai_security_group_id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.ai_service.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 4. Background Workers Task Definition & Service
# ------------------------------------------------------------------------------
resource "aws_ecs_task_definition" "workers" {
  family                   = "${var.environment}-opspilot-workers"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_cpu
  memory                   = var.worker_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_workers_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "workers"
      image     = var.api_image
      essential = true
      command   = ["node", "apps/api/dist/workers/document-processing.worker.js"]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "AI_SERVICE_URL", value = "http://ai-service.opspilot.internal:8000" },
        { name = "DOCUMENT_STORAGE_PROVIDER", value = "s3" },
        { name = "AWS_S3_DOCUMENT_BUCKET", value = var.documents_bucket_name },
        { name = "AWS_REGION", value = var.aws_region }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${var.api_secrets_arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${var.api_secrets_arn}:REDIS_URL::" },
        { name = "AI_SERVICE_INTERNAL_TOKEN", valueFrom = "${var.api_secrets_arn}:AI_SERVICE_INTERNAL_TOKEN::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.worker_log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "workers" {
  name            = "${var.environment}-opspilot-workers-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.workers.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.application_subnet_ids
    security_groups  = [var.workers_security_group_id]
    assign_public_ip = false
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 5. One-Off Migration Runner Task Definition
# ------------------------------------------------------------------------------
resource "aws_ecs_task_definition" "migration_runner" {
  family                   = "${var.environment}-opspilot-migrations"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.migration_runner_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "migration-runner"
      image     = var.api_image
      essential = true
      command   = ["npm", "run", "db:migrate", "--workspace=@opspilot/api"]

      environment = [
        { name = "NODE_ENV", value = "production" }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${var.api_secrets_arn}:DATABASE_URL::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.migration_log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migrations"
        }
      }
    }
  ])

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 6. Auto-Scaling Policies for Node.js API Service
# ------------------------------------------------------------------------------
resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.api_max_count
  min_capacity       = var.api_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.environment}-api-cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
