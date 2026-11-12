output "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "api_secrets_arn" {
  description = "ARN of the Node.js API runtime secrets"
  value       = aws_secretsmanager_secret.api_secrets.arn
}

output "ai_secrets_arn" {
  description = "ARN of the Python AI runtime secrets"
  value       = aws_secretsmanager_secret.ai_secrets.arn
}

output "postgres_admin_password" {
  description = "Initial generated PostgreSQL admin password"
  value       = random_password.postgres_admin.result
  sensitive   = true
}

output "redis_auth_token" {
  description = "Initial generated Redis AUTH token"
  value       = random_password.redis_auth.result
  sensitive   = true
}
