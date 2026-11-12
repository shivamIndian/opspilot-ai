output "api_log_group_name" {
  description = "Name of the Node.js API CloudWatch log group"
  value       = aws_cloudwatch_log_group.api.name
}

output "ai_log_group_name" {
  description = "Name of the Python AI CloudWatch log group"
  value       = aws_cloudwatch_log_group.ai.name
}

output "worker_log_group_name" {
  description = "Name of the background workers CloudWatch log group"
  value       = aws_cloudwatch_log_group.workers.name
}

output "migration_log_group_name" {
  description = "Name of the migrations CloudWatch log group"
  value       = aws_cloudwatch_log_group.migrations.name
}

output "alerts_topic_arn" {
  description = "ARN of the SNS alerts notification topic"
  value       = aws_sns_topic.alerts.arn
}
