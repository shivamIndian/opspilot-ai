variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "engine_version" {
  type        = string
  description = "PostgreSQL engine version"
  default     = "16.4"
}

variable "instance_class" {
  type        = string
  description = "RDS instance class (e.g. db.t4g.micro for dev, db.m6g.large for prod)"
  default     = "db.t4g.small"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GiB"
  default     = 20
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage limit for autoscaling in GiB"
  default     = 100
}

variable "database_name" {
  type        = string
  description = "Default database name"
  default     = "opspilot_db"
}

variable "admin_username" {
  type        = string
  description = "Master database username"
  default     = "opspilot_admin"
}

variable "admin_password" {
  type        = string
  description = "Master database password (injected via Secrets Manager in prod)"
  sensitive   = true
}

variable "db_subnet_group_name" {
  type        = string
  description = "RDS DB Subnet Group Name"
}

variable "security_group_id" {
  type        = string
  description = "Security Group ID for RDS access"
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ high availability deployment"
  default     = false
}

variable "deletion_protection" {
  type        = bool
  description = "Prevent accidental database termination"
  default     = false
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final DB snapshot on destruction (set true only in ephemeral dev/test)"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Automated backup retention days (0-35)"
  default     = 7
}

variable "kms_key_arn" {
  type        = string
  description = "Optional KMS key ARN for storage encryption (defaults to AWS managed key if null)"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
