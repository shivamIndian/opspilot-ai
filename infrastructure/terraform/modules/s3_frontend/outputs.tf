output "bucket_id" {
  description = "Name of the frontend static assets S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "bucket_arn" {
  description = "ARN of the frontend static assets S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (for invalidation during release)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Default domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}
