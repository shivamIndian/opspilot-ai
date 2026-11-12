variable "aws_region" {
  type        = string
  description = "AWS region for Terraform state storage"
  default     = "us-east-1"
}

variable "state_bucket_name" {
  type        = string
  description = "Custom name for state S3 bucket (defaults to opspilot-terraform-state-<account-id>)"
  default     = null
}

variable "lock_table_name" {
  type        = string
  description = "DynamoDB table name for Terraform state locking"
  default     = "opspilot-terraform-locks"
}
