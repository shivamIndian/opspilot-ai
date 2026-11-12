variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "custom_domain" {
  type        = string
  description = "Optional custom domain name for frontend (e.g. app.opspilot.com)"
  default     = null
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN for custom domain (must be in us-east-1 for CloudFront)"
  default     = null
}

variable "price_class" {
  type        = string
  description = "CloudFront price class (PriceClass_100, PriceClass_200, PriceClass_All)"
  default     = "PriceClass_100"
}

variable "force_destroy" {
  type        = bool
  description = "Allow destroying S3 bucket with contents (set true for ephemeral dev/staging)"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
