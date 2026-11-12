variable "environment" {
  type        = string
  description = "Environment name"
  default     = "staging"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "api_image" {
  type        = string
  description = "ECR image URI for Node.js API"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/opspilot-api:staging-latest"
}

variable "ai_image" {
  type        = string
  description = "ECR image URI for Python AI microservice"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/opspilot-ai-service:staging-latest"
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API Key for Staging (injected via Secrets Manager or CI)"
  default     = "placeholder-openai-staging-key"
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
  description = "Optional custom domain for frontend (e.g. staging.opspilot.com)"
  default     = null
}

variable "frontend_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN for frontend CloudFront"
  default     = null
}

variable "api_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN for ALB HTTPS listener"
  default     = null
}
