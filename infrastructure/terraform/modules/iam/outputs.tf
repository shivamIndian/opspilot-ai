output "ecs_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_api_task_role_arn" {
  description = "ARN of the Node.js API ECS task role"
  value       = aws_iam_role.ecs_api_task.arn
}

output "ecs_ai_task_role_arn" {
  description = "ARN of the Python AI microservice ECS task role"
  value       = aws_iam_role.ecs_ai_task.arn
}

output "ecs_workers_task_role_arn" {
  description = "ARN of the background workers ECS task role"
  value       = aws_iam_role.ecs_workers_task.arn
}

output "migration_runner_task_role_arn" {
  description = "ARN of the migration runner ECS task role"
  value       = aws_iam_role.migration_runner_task.arn
}

output "github_deploy_role_arn" {
  description = "ARN of the GitHub Actions OIDC deployment role"
  value       = aws_iam_role.github_deploy.arn
}
