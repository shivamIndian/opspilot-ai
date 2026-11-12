variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days (e.g. 7 for dev, 90 for prod)"
  default     = 30
}

variable "ecs_cluster_name" {
  type        = string
  description = "Name of the ECS Cluster"
}

variable "api_service_name" {
  type        = string
  description = "Name of the Node.js API ECS Service"
}

variable "ai_service_name" {
  type        = string
  description = "Name of the Python AI ECS Service"
}

variable "alb_arn_suffix" {
  type        = string
  description = "ARN suffix of the Application Load Balancer"
}

variable "alb_target_group_arn_suffix" {
  type        = string
  description = "ARN suffix of the ALB Target Group"
}

variable "rds_identifier" {
  type        = string
  description = "RDS database instance identifier"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
