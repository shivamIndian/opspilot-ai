variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "documents_bucket_arn" {
  type        = string
  description = "ARN of the S3 private documents bucket"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository for OIDC trust (e.g. organization/opspilot-ai)"
  default     = "organization/opspilot-ai"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Whether to create the GitHub Actions OIDC provider (false if already exists in AWS account)"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
