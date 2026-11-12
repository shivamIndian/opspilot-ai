output "frontend_cloudfront_domain" {
  description = "CloudFront distribution URL for React frontend"
  value       = module.s3_frontend.cloudfront_domain_name
}

output "api_alb_dns_name" {
  description = "Public ALB DNS name for API endpoints"
  value       = module.alb.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds_postgres.endpoint
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = module.elasticache_redis.primary_endpoint_address
}

output "github_deploy_role_arn" {
  description = "IAM Role ARN for GitHub Actions deployment"
  value       = module.iam.github_deploy_role_arn
}

output "s3_documents_bucket" {
  description = "S3 private documents bucket name"
  value       = module.s3_documents.bucket_id
}
