variable "environment" {
  type        = string
  description = "Environment name"
  default     = "production"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "api_image" {
  type        = string
  description = "ECR image URI for Node.js API"
}

variable "ai_image" {
  type        = string
  description = "ECR image URI for Python AI microservice"
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API Key for Production"
  sensitive   = true
}

variable "github_repo" {
  type        = string
  description = "GitHub repository for OIDC trust (e.g. org/opspilot-ai)"
  default     = "organization/opspilot-ai"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Whether to create the GitHub Actions OIDC provider"
  default     = true
}

variable "frontend_domain" {
  type        = string
  description = "Custom domain for frontend (e.g. app.opspilot.com)"
  default     = null
}

variable "frontend_certificate_arn" {
  type        = string
  description = "ACM certificate ARN for frontend CloudFront in us-east-1"
  default     = null
}

variable "api_certificate_arn" {
  type        = string
  description = "ACM certificate ARN for ALB HTTPS listener"
  default     = null
}

variable "rds_instance_class" {
  type        = string
  description = "Production RDS instance class"
  default     = "db.m6g.large"
}

variable "redis_node_type" {
  type        = string
  description = "Production ElastiCache node type"
  default     = "cache.m6g.large"
}

variable "api_cpu" {
  type        = string
  description = "Fargate CPU units for API tasks"
  default     = "1024"
}

variable "api_memory" {
  type        = string
  description = "Fargate Memory (MiB) for API tasks"
  default     = "2048"
}

variable "ai_cpu" {
  type        = string
  description = "Fargate CPU units for AI microservice tasks"
  default     = "2048"
}

variable "ai_memory" {
  type        = string
  description = "Fargate Memory (MiB) for AI microservice tasks"
  default     = "4096"
}

variable "api_desired_count" {
  type        = number
  description = "Desired number of API task replicas"
  default     = 2
}

variable "ai_desired_count" {
  type        = number
  description = "Desired number of AI microservice task replicas"
  default     = 2
}
