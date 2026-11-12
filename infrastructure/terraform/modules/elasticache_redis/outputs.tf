output "primary_endpoint_address" {
  description = "Primary endpoint address for Redis connections"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "Reader endpoint address for read scaling"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "port" {
  description = "Port number for Redis connections"
  value       = aws_elasticache_replication_group.redis.port
}
