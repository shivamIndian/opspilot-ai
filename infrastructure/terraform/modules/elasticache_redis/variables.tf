variable "environment" {
  type        = string
  description = "Deployment environment name (dev, staging, production)"
}

variable "engine_version" {
  type        = string
  description = "Redis engine version"
  default     = "7.1"
}

variable "node_type" {
  type        = string
  description = "ElastiCache node type (e.g. cache.t4g.micro for dev, cache.m6g.large for prod)"
  default     = "cache.t4g.micro"
}

variable "num_cache_clusters" {
  type        = number
  description = "Number of cache clusters (1 for standalone dev, 2+ for Multi-AZ prod)"
  default     = 1
}

variable "auth_token" {
  type        = string
  description = "Redis AUTH token (min 16 chars)"
  sensitive   = true
}

variable "subnet_group_name" {
  type        = string
  description = "ElastiCache Subnet Group Name"
}

variable "security_group_id" {
  type        = string
  description = "Security Group ID for Redis access"
}

variable "snapshot_retention_limit" {
  type        = number
  description = "Daily snapshot retention days (0 to disable)"
  default     = 1
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
