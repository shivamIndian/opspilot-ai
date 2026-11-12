variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
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
