variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "api_image" {
  type        = string
  description = "ECR image URI for Node.js API"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/opspilot-api:dev-latest"
}

variable "ai_image" {
  type        = string
  description = "ECR image URI for Python AI microservice"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/opspilot-ai-service:dev-latest"
}

variable "openai_api_key" {
  type        = string
  description = "OpenAI API Key for Dev"
  default     = "placeholder-openai-dev-key"
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
