variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "Target VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for ALB placement"
}

variable "security_group_id" {
  type        = string
  description = "Security Group ID for the ALB"
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM certificate ARN for HTTPS listener"
  default     = null
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Prevent accidental ALB deletion (set true for production)"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
