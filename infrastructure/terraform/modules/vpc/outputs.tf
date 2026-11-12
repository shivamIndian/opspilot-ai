output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs (for ALB and NAT)"
  value       = aws_subnet.public[*].id
}

output "application_subnet_ids" {
  description = "List of private application subnet IDs (for ECS Fargate)"
  value       = aws_subnet.application[*].id
}

output "data_subnet_ids" {
  description = "List of private data subnet IDs (for RDS and ElastiCache)"
  value       = aws_subnet.data[*].id
}

output "db_subnet_group_name" {
  description = "Name of the RDS database subnet group"
  value       = aws_db_subnet_group.rds.name
}

output "redis_subnet_group_name" {
  description = "Name of the ElastiCache Redis subnet group"
  value       = aws_elasticache_subnet_group.redis.name
}
