variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  type        = string
  description = "Base CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "az_count" {
  type        = number
  description = "Number of Availability Zones to utilize (min 2 for High Availability)"
  default     = 2
}

variable "single_nat_gateway" {
  type        = bool
  description = "If true, provision only 1 NAT Gateway for cost savings in dev/staging. If false, provision 1 per AZ for production fault-tolerance."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Common resource tags"
  default     = {}
}
