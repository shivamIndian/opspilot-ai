output "endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "Port of the RDS instance"
  value       = aws_db_instance.postgres.port
}

output "database_name" {
  description = "Name of the default database"
  value       = aws_db_instance.postgres.db_name
}

output "instance_arn" {
  description = "ARN of the RDS database instance"
  value       = aws_db_instance.postgres.arn
}

output "resource_id" {
  description = "RDS Resource ID (for CloudWatch metric tracking)"
  value       = aws_db_instance.postgres.resource_id
}
