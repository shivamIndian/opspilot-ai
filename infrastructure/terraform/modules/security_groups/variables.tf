variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "vpc_id" {
  type        = string
  description = "Target VPC ID"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
