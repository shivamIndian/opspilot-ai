output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "Name of the Node.js API ECS service"
  value       = aws_ecs_service.api.name
}

output "ai_service_name" {
  description = "Name of the Python AI ECS service"
  value       = aws_ecs_service.ai_service.name
}

output "workers_service_name" {
  description = "Name of the background workers ECS service"
  value       = aws_ecs_service.workers.name
}

output "migration_task_definition_arn" {
  description = "ARN of the migration runner task definition"
  value       = aws_ecs_task_definition.migration_runner.arn
}
