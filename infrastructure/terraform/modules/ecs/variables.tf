variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "application_subnet_ids" {
  type        = list(string)
  description = "Private application subnet IDs for Fargate tasks"
}

variable "api_security_group_id" {
  type        = string
  description = "Security Group ID for Node.js API"
}

variable "ai_security_group_id" {
  type        = string
  description = "Security Group ID for Python AI service"
}

variable "workers_security_group_id" {
  type        = string
  description = "Security Group ID for background workers"
}

variable "api_target_group_arn" {
  type        = string
  description = "ALB target group ARN for Node.js API"
}

variable "documents_bucket_name" {
  type        = string
  description = "S3 private documents bucket name"
}

variable "ecs_execution_role_arn" {
  type        = string
  description = "ECS execution role ARN"
}

variable "ecs_api_task_role_arn" {
  type        = string
  description = "Node.js API ECS task role ARN"
}

variable "ecs_ai_task_role_arn" {
  type        = string
  description = "Python AI microservice ECS task role ARN"
}

variable "ecs_workers_task_role_arn" {
  type        = string
  description = "Workers ECS task role ARN"
}

variable "migration_runner_task_role_arn" {
  type        = string
  description = "Migration runner ECS task role ARN"
}

variable "api_secrets_arn" {
  type        = string
  description = "Secrets Manager ARN for API secrets"
}

variable "ai_secrets_arn" {
  type        = string
  description = "Secrets Manager ARN for AI service secrets"
}

variable "api_image" {
  type        = string
  description = "Container image URI for Node.js API"
}

variable "ai_image" {
  type        = string
  description = "Container image URI for Python AI microservice"
}

variable "api_cpu" {
  type        = string
  description = "CPU units for API task (256, 512, 1024)"
  default     = "512"
}

variable "api_memory" {
  type        = string
  description = "Memory (MiB) for API task"
  default     = "1024"
}

variable "ai_cpu" {
  type        = string
  description = "CPU units for AI task (512, 1024, 2048)"
  default     = "1024"
}

variable "ai_memory" {
  type        = string
  description = "Memory (MiB) for AI task"
  default     = "2048"
}

variable "worker_cpu" {
  type        = string
  description = "CPU units for background worker task"
  default     = "512"
}

variable "worker_memory" {
  type        = string
  description = "Memory (MiB) for background worker task"
  default     = "1024"
}

variable "api_desired_count" {
  type        = number
  description = "Desired replica count for Node.js API service"
  default     = 2
}

variable "api_min_count" {
  type        = number
  description = "Autoscaling minimum task count for Node.js API"
  default     = 1
}

variable "api_max_count" {
  type        = number
  description = "Autoscaling maximum task count for Node.js API"
  default     = 10
}

variable "ai_desired_count" {
  type        = number
  description = "Desired replica count for Python AI service"
  default     = 2
}

variable "worker_desired_count" {
  type        = number
  description = "Desired replica count for workers service"
  default     = 1
}

variable "api_log_group_name" {
  type        = string
  description = "CloudWatch log group for API"
}

variable "ai_log_group_name" {
  type        = string
  description = "CloudWatch log group for AI service"
}

variable "worker_log_group_name" {
  type        = string
  description = "CloudWatch log group for background workers"
}

variable "migration_log_group_name" {
  type        = string
  description = "CloudWatch log group for migrations"
}

variable "enable_container_insights" {
  type        = bool
  description = "Enable ECS Container Insights"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
