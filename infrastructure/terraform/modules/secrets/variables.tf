variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "db_host" {
  type        = string
  description = "RDS PostgreSQL host address"
  default     = "localhost"
}

variable "db_port" {
  type        = number
  description = "RDS PostgreSQL port"
  default     = 5432
}

variable "db_name" {
  type        = string
  description = "RDS PostgreSQL database name"
  default     = "opspilot_db"
}

variable "redis_host" {
  type        = string
  description = "ElastiCache Redis primary endpoint address"
  default     = "localhost"
}

variable "redis_port" {
  type        = number
  description = "ElastiCache Redis port"
  default     = 6379
}

variable "openai_api_key_placeholder" {
  type        = string
  description = "Initial placeholder for OpenAI API Key (replace via AWS Secrets Manager console)"
  default     = "placeholder-replace-in-secrets-manager"
  sensitive   = true
}

variable "kms_key_arn" {
  type        = string
  description = "Optional KMS key ARN for encrypting secrets"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
