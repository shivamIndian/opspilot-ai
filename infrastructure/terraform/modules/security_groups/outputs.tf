output "alb_security_group_id" {
  description = "Security Group ID for Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "ecs_api_security_group_id" {
  description = "Security Group ID for Node.js API tasks"
  value       = aws_security_group.ecs_api.id
}

output "ecs_ai_security_group_id" {
  description = "Security Group ID for Python AI microservice tasks"
  value       = aws_security_group.ecs_ai.id
}

output "ecs_workers_security_group_id" {
  description = "Security Group ID for background worker tasks"
  value       = aws_security_group.ecs_workers.id
}

output "migration_runner_security_group_id" {
  description = "Security Group ID for migration runner tasks"
  value       = aws_security_group.migration_runner.id
}

output "rds_security_group_id" {
  description = "Security Group ID for RDS PostgreSQL"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "Security Group ID for ElastiCache Redis"
  value       = aws_security_group.redis.id
}
